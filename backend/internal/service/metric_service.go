package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/metric"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
	"gorm.io/gorm"
)

type MetricService struct {
	signalRepo      *repository.SignalRepository
	signalObsRepo   *repository.SignalObservationRepository
	canonicalRepo   *repository.CanonicalObservationRepository
	claimRepo       *repository.ConstructClaimRegistryRepository
	registerRepo    *repository.ConstructRegisterRepository
	normRepo        *repository.MetricNormRepository
	rewardRepo      *repository.RewardSystemRepository
	jobRepo         *repository.JobRepository
	metricRunRepo   *repository.MetricRunRepository
	estimateRepo    *repository.ConstructEstimateRepository
	rewardScoreRepo *repository.RewardScoreRepository
}

type JobFitResult struct {
	JobID         uuid.UUID
	JobTitle      string
	AsOf          time.Time
	RewardID      string
	MetricWeights map[string]float64
	Score         metric.RewardScore
	Readings      map[string]metric.MetricReading
	Estimates     map[string]metric.ConstructEstimate
	MetricRun     *model.MetricRun
	WasDerived    bool
}

func NewMetricService(
	signalRepo *repository.SignalRepository,
	signalObsRepo *repository.SignalObservationRepository,
	canonicalRepo *repository.CanonicalObservationRepository,
	claimRepo *repository.ConstructClaimRegistryRepository,
	registerRepo *repository.ConstructRegisterRepository,
	normRepo *repository.MetricNormRepository,
	rewardRepo *repository.RewardSystemRepository,
	jobRepo *repository.JobRepository,
	metricRunRepo *repository.MetricRunRepository,
	estimateRepo *repository.ConstructEstimateRepository,
	rewardScoreRepo *repository.RewardScoreRepository,
) *MetricService {
	return &MetricService{
		signalRepo:      signalRepo,
		signalObsRepo:   signalObsRepo,
		canonicalRepo:   canonicalRepo,
		claimRepo:       claimRepo,
		registerRepo:    registerRepo,
		normRepo:        normRepo,
		rewardRepo:      rewardRepo,
		jobRepo:         jobRepo,
		metricRunRepo:   metricRunRepo,
		estimateRepo:    estimateRepo,
		rewardScoreRepo: rewardScoreRepo,
	}
}

func (s *MetricService) EnsureUserTraits(ctx context.Context, userID uuid.UUID, asOf time.Time, notes string) (*model.MetricRun, map[string]metric.ConstructEstimate, error) {
	claims, err := metric.LoadClaimRegistry(ctx, s.claimRepo)
	if err != nil {
		return nil, nil, err
	}
	register, err := metric.LoadConstructRegister(ctx, s.registerRepo)
	if err != nil {
		return nil, nil, err
	}
	norms, err := metric.LoadNorms(ctx, s.normRepo)
	if err != nil {
		return nil, nil, err
	}
	signals, err := s.signalRepo.ListByUserBefore(ctx, userID, asOf)
	if err != nil {
		return nil, nil, err
	}
	signals = s.signalRepo.DedupeLatestBySignalType(signals)
	scoringSignals, err := toScoringSignals(signals)
	if err != nil {
		return nil, nil, err
	}
	estimates := metric.RunTraitPipeline(scoringSignals, claims, register, norms, userID, asOf)

	runNotes := notes
	if runNotes == "" {
		runNotes = "metric:ensure-user-traits"
	}
	run := &model.MetricRun{
		AsOf:       asOf,
		UserID:     userID,
		NEstimates: len(estimates),
		NScores:    0,
		Notes:      &runNotes,
	}
	if err := s.metricRunRepo.Create(ctx, run); err != nil {
		return nil, nil, err
	}
	rows, err := toEstimateRows(run.ID, userID, estimates)
	if err != nil {
		return nil, nil, err
	}
	if err := s.estimateRepo.CreateBatch(ctx, rows); err != nil {
		return nil, nil, err
	}
	return run, estimates, nil
}

func (s *MetricService) ComputeJobFit(ctx context.Context, userID uuid.UUID, jobID uuid.UUID, asOf time.Time, notes string) (*JobFitResult, error) {
	job, err := s.jobRepo.GetByID(ctx, jobID)
	if err != nil {
		return nil, err
	}
	rewardSystems, err := metric.LoadRewardSystems(ctx, s.rewardRepo)
	if err != nil {
		return nil, err
	}
	rewardSystem, ok := rewardSystems[job.RewardSystemID]
	if !ok {
		return nil, fmt.Errorf("reward system not found: %s", job.RewardSystemID)
	}
	score, readings, estimates, derived, err := s.scoreRewardSystemForUser(ctx, userID, rewardSystem, asOf)
	if err != nil {
		return nil, err
	}

	runNotes := notes
	if runNotes == "" {
		runNotes = "metric:compute-job-fit"
	}
	run := &model.MetricRun{
		AsOf:       asOf,
		UserID:     userID,
		NEstimates: len(estimates),
		NScores:    1,
		Notes:      &runNotes,
	}
	if err := s.metricRunRepo.Create(ctx, run); err != nil {
		return nil, err
	}

	spec, err := json.Marshal(score)
	if err != nil {
		return nil, err
	}
	readingsJSON, err := json.Marshal(readings)
	if err != nil {
		return nil, err
	}
	row := &model.RewardScore{
		RunID:          run.ID,
		UserID:         userID,
		RewardSystemID: rewardSystem.ID,
		Score:          score.Score,
		CILower:        score.Confidence.Lower,
		CIUpper:        score.Confidence.Upper,
		Spec:           model.JSONB(spec),
		Readings:       model.JSONB(readingsJSON),
	}
	if err := s.rewardScoreRepo.Upsert(ctx, row); err != nil {
		return nil, err
	}

	return &JobFitResult{
		JobID:         job.ID,
		JobTitle:      job.Title,
		AsOf:          asOf,
		RewardID:      rewardSystem.ID,
		MetricWeights: rewardSystem.MetricWeights,
		Score:         score,
		Readings:      readings,
		Estimates:     estimates,
		MetricRun:     run,
		WasDerived:    derived,
	}, nil
}

func (s *MetricService) ScoreJobFitForUser(ctx context.Context, userID uuid.UUID, job *model.Job, asOf time.Time) (*JobFitResult, error) {
	rewardSystems, err := metric.LoadRewardSystems(ctx, s.rewardRepo)
	if err != nil {
		return nil, err
	}
	rewardSystem, ok := rewardSystems[job.RewardSystemID]
	if !ok {
		return nil, fmt.Errorf("reward system not found: %s", job.RewardSystemID)
	}
	return s.ScoreJobFitForUserWithRewardSystem(ctx, userID, job, rewardSystem, asOf)
}

func (s *MetricService) ScoreJobFitForUserWithRewardSystem(
	ctx context.Context,
	userID uuid.UUID,
	job *model.Job,
	rewardSystem metric.RewardSystem,
	asOf time.Time,
) (*JobFitResult, error) {
	score, readings, estimates, derived, err := s.scoreRewardSystemForUser(ctx, userID, rewardSystem, asOf)
	if err != nil {
		return nil, err
	}

	return &JobFitResult{
		JobID:         job.ID,
		JobTitle:      job.Title,
		AsOf:          asOf,
		RewardID:      rewardSystem.ID,
		MetricWeights: rewardSystem.MetricWeights,
		Score:         score,
		Readings:      readings,
		Estimates:     estimates,
		MetricRun:     nil,
		WasDerived:    derived,
	}, nil
}

func (s *MetricService) scoreRewardSystemForUser(
	ctx context.Context,
	userID uuid.UUID,
	rewardSystem metric.RewardSystem,
	asOf time.Time,
) (metric.RewardScore, map[string]metric.MetricReading, map[string]metric.ConstructEstimate, bool, error) {
	estimateRows, _, err := s.estimateRepo.LatestByUser(ctx, userID, asOf)
	derived := false
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return metric.RewardScore{}, nil, nil, false, err
	}
	estimates, err := parseEstimateRows(estimateRows)
	if err != nil {
		return metric.RewardScore{}, nil, nil, false, err
	}
	if len(estimates) == 0 {
		_, estimates, ensureErr := s.EnsureUserTraits(ctx, userID, asOf, "metric:auto-ensure-user-traits")
		if ensureErr != nil {
			return metric.RewardScore{}, nil, nil, false, ensureErr
		}
		derived = true
		if len(estimates) == 0 {
			return metric.RewardScore{}, nil, nil, false, fmt.Errorf("no construct estimates generated for user %s", userID.String())
		}
	}
	score, readings := metric.ScoreRewardSystem(rewardSystem, estimates, userID)
	return score, readings, estimates, derived, nil
}

func toScoringSignals(rows []model.Signal) ([]metric.ScoringSignal, error) {
	out := make([]metric.ScoringSignal, 0, len(rows))
	for _, row := range rows {
		converted, err := metric.SignalToScoringSignal(row)
		if err != nil {
			return nil, err
		}
		out = append(out, converted)
	}
	return out, nil
}

func toEstimateRows(runID, userID uuid.UUID, estimates map[string]metric.ConstructEstimate) ([]model.ConstructEstimate, error) {
	rows := make([]model.ConstructEstimate, 0, len(estimates))
	for trait, estimate := range estimates {
		spec, err := json.Marshal(estimate)
		if err != nil {
			return nil, err
		}
		rows = append(rows, model.ConstructEstimate{
			RunID:      runID,
			UserID:     userID,
			Trait:      trait,
			Value:      estimate.Value,
			CILower:    estimate.Confidence.Lower,
			CIUpper:    estimate.Confidence.Upper,
			NEffective: estimate.Evidence.NEffective,
			Spec:       model.JSONB(spec),
		})
	}
	return rows, nil
}

func parseEstimateRows(rows []model.ConstructEstimate) (map[string]metric.ConstructEstimate, error) {
	out := make(map[string]metric.ConstructEstimate, len(rows))
	for _, row := range rows {
		var estimate metric.ConstructEstimate
		if len(row.Spec) > 0 {
			if err := json.Unmarshal(row.Spec, &estimate); err != nil {
				return nil, err
			}
		}
		if estimate.Trait == "" {
			estimate = metric.ConstructEstimate{
				UserID: row.UserID,
				Trait:  row.Trait,
				Value:  row.Value,
				Confidence: metric.ConfidenceInterval{
					Point: row.Value,
					Lower: row.CILower,
					Upper: row.CIUpper,
					Level: 0.95,
				},
				Evidence: metric.EvidenceDensity{
					NEffective: row.NEffective,
				},
			}
		}
		out[row.Trait] = estimate
	}
	return out, nil
}
