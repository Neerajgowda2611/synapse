package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/logs"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
	"github.com/profiler/backend/internal/signal"
)

type DerivationService struct {
	canonicalRepo *repository.CanonicalObservationRepository
	ruleRepo      *repository.DerivationRuleRegistryRepository
	runRepo       *repository.DerivationRunRepository
	signalRepo    *repository.SignalRepository
	skipRepo      *repository.DerivationSkipRepository
	signalObsRepo *repository.SignalObservationRepository
}

func NewDerivationService(
	canonicalRepo *repository.CanonicalObservationRepository,
	ruleRepo *repository.DerivationRuleRegistryRepository,
	runRepo *repository.DerivationRunRepository,
	signalRepo *repository.SignalRepository,
	skipRepo *repository.DerivationSkipRepository,
	signalObsRepo *repository.SignalObservationRepository,
) *DerivationService {
	return &DerivationService{
		canonicalRepo: canonicalRepo,
		ruleRepo:      ruleRepo,
		runRepo:       runRepo,
		signalRepo:    signalRepo,
		skipRepo:      skipRepo,
		signalObsRepo: signalObsRepo,
	}
}

func (s *DerivationService) DeriveForCanonicalObservation(ctx context.Context, canonicalObservationID uuid.UUID) error {
	obs, err := s.canonicalRepo.GetByID(ctx, canonicalObservationID)
	if err != nil {
		return err
	}

	specs, err := s.listApprovedRuleSpecs(ctx)
	if err != nil {
		return err
	}
	pointSpecs := make([]signal.DerivationRuleSpec, 0, len(specs))
	for _, spec := range specs {
		if signal.IsPointPrimitive(spec.Primitive) {
			pointSpecs = append(pointSpecs, spec)
		}
	}

	signals, skips := signal.DeriveForObservation(*obs, pointSpecs, time.Now().UTC())
	return s.persist(ctx, obs.UserID, time.Now().UTC(), signals, skips, "auto:post-canonicalize")
}

func (s *DerivationService) DeriveForUser(ctx context.Context, userID uuid.UUID, asOf time.Time, notes string) error {
	observations, err := s.canonicalRepo.ListByUserBefore(ctx, userID, asOf)
	if err != nil {
		return err
	}
	if len(observations) == 0 {
		return nil
	}

	specs, err := s.listApprovedRuleSpecs(ctx)
	if err != nil {
		return err
	}

	signals, skips := signal.DeriveForUser(observations, specs, asOf, userID)
	return s.persist(ctx, userID, asOf, signals, skips, notes)
}

func (s *DerivationService) ListRecentUsers(ctx context.Context, since time.Time, limit int) ([]uuid.UUID, error) {
	return s.canonicalRepo.ListRecentUserIDs(ctx, since, limit)
}

func (s *DerivationService) DeriveForCanonicalObservationAsync(canonicalObservationID uuid.UUID) {
	go func() {
		if err := s.DeriveForCanonicalObservation(context.Background(), canonicalObservationID); err != nil {
			logs.Error("derivation for canonical observation failed", "canonical_observation_id", canonicalObservationID.String(), "error", err.Error())
		}
	}()
}

func (s *DerivationService) DeriveForUserAsync(userID uuid.UUID, asOf time.Time, notes string) {
	go func() {
		if err := s.DeriveForUser(context.Background(), userID, asOf, notes); err != nil {
			logs.Error("derivation for user failed", "user_id", userID.String(), "error", err.Error())
		}
	}()
}

func (s *DerivationService) listApprovedRuleSpecs(ctx context.Context) ([]signal.DerivationRuleSpec, error) {
	rows, err := s.ruleRepo.ListApproved(ctx)
	if err != nil {
		return nil, err
	}
	specs := make([]signal.DerivationRuleSpec, 0, len(rows))
	for _, row := range rows {
		spec, err := signal.ParseRuleSpec(json.RawMessage(row.Spec))
		if err != nil {
			return nil, err
		}
		// Ensure registry row metadata wins if spec omitted it.
		spec.RuleID = row.RuleID
		if spec.Version == "" {
			spec.Version = row.Version
		}
		if spec.Primitive == "" {
			spec.Primitive = row.Primitive
		}
		if spec.OutputSignalType == "" {
			spec.OutputSignalType = row.OutputSignalType
		}
		specs = append(specs, *spec)
	}
	return specs, nil
}

func (s *DerivationService) persist(ctx context.Context, userID uuid.UUID, asOf time.Time, emittedSignals []signal.EmittedSignal, emittedSkips []signal.EmittedSkip, notes string) error {
	filteredSignals := make([]signal.EmittedSignal, 0, len(emittedSignals))
	for _, emitted := range emittedSignals {
		if len(emitted.ObservationIDs) == 1 {
			exists, err := s.signalObsRepo.ExistsByCanonicalAndRule(ctx, emitted.ObservationIDs[0], emitted.Signal.RuleID)
			if err != nil {
				return err
			}
			if exists {
				continue
			}
		}
		filteredSignals = append(filteredSignals, emitted)
	}

	runNotes := notes
	run := &model.DerivationRun{
		AsOf:     asOf,
		UserID:   &userID,
		NSignals: len(filteredSignals),
		NSkips:   len(emittedSkips),
		Notes:    &runNotes,
	}
	if err := s.runRepo.Create(ctx, run); err != nil {
		return err
	}

	signals := make([]model.Signal, 0, len(filteredSignals))
	signalObservations := make([]model.SignalObservation, 0, len(filteredSignals))
	for _, emitted := range filteredSignals {
		sig := emitted.Signal
		sig.RunID = run.ID
		signals = append(signals, sig)
	}
	if err := s.signalRepo.CreateBatch(ctx, signals); err != nil {
		return err
	}
	for i, emitted := range filteredSignals {
		signalID := signals[i].ID
		for _, observationID := range emitted.ObservationIDs {
			signalObservations = append(signalObservations, model.SignalObservation{
				SignalID:               signalID,
				CanonicalObservationID: observationID,
				RuleID:                 emitted.Signal.RuleID,
			})
		}
	}
	if err := s.signalObsRepo.CreateBatch(ctx, signalObservations); err != nil {
		return err
	}

	skips := make([]model.DerivationSkip, 0, len(emittedSkips))
	for _, emitted := range emittedSkips {
		skip := emitted.Skip
		skip.RunID = run.ID
		skips = append(skips, skip)
	}
	return s.skipRepo.CreateBatch(ctx, skips)
}
