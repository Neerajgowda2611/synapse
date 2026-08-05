package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/metric"
	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
)

var (
	ErrJobNotFound   = errors.New("job not found")
	ErrTraitNotFound = errors.New("trait estimate not found")
)

type JobCriteriaMetric struct {
	MetricID   string             `json:"metric_id"`
	Trait      *string            `json:"trait,omitempty"`
	Weight     float64            `json:"weight"`
	Kind       metric.MetricKind  `json:"kind"`
	Shape      metric.MetricShape `json:"shape"`
	Peak       *float64           `json:"peak,omitempty"`
	Pole       *string            `json:"pole,omitempty"`
	Components map[string]float64 `json:"components,omitempty"`
}

type JobRewardCriteria struct {
	ID        string              `json:"id"`
	Label     string              `json:"label"`
	Version   string              `json:"version"`
	WeightSum float64             `json:"weight_sum"`
	Metrics   []JobCriteriaMetric `json:"metrics"`
}

type JobWithCriteria struct {
	ID             uuid.UUID         `json:"id"`
	Title          string            `json:"title"`
	CompanyName    *string           `json:"company_name,omitempty"`
	Subtitle       *string           `json:"subtitle,omitempty"`
	ExternalURL    *string           `json:"external_url,omitempty"`
	RewardSystemID string            `json:"reward_system_id"`
	Status         string            `json:"status"`
	Criteria       JobRewardCriteria `json:"criteria"`
}

type UserTraitSummary struct {
	Trait      string                    `json:"trait"`
	Value      float64                   `json:"value"`
	Confidence metric.ConfidenceInterval `json:"confidence"`
	Evidence   metric.EvidenceDensity    `json:"evidence"`
	AsOf       time.Time                 `json:"as_of"`
}

type JobFitTraitReading struct {
	Trait        string  `json:"trait"`
	MetricID     string  `json:"metric_id"`
	Weight       float64 `json:"weight"`
	TraitValue   float64 `json:"trait_value"`
	MetricValue  float64 `json:"metric_value"`
	Usable       bool    `json:"usable"`
	Contribution float64 `json:"contribution"`
	Missing      bool    `json:"missing"`
}

type JobFitResponse struct {
	JobID             uuid.UUID                 `json:"job_id"`
	JobTitle          string                    `json:"job_title"`
	RewardSystemID    string                    `json:"reward_system_id"`
	AsOf              time.Time                 `json:"as_of"`
	FitPercent        float64                   `json:"fit_percent"`
	Score             float64                   `json:"score"`
	RawScore          float64                   `json:"raw_score"`
	WeightSum         float64                   `json:"weight_sum"`
	Confidence        metric.ConfidenceInterval `json:"confidence"`
	SuppressedMetrics []string                  `json:"suppressed_metrics"`
	Traits            []JobFitTraitReading      `json:"traits"`
	MissingTraits     []string                  `json:"missing_traits"`
	TraitsAutoRefresh bool                      `json:"traits_auto_refreshed"`
}

type EvidenceSource struct {
	Connector        string         `json:"connector"`
	EventType        string         `json:"event_type"`
	BindingID        string         `json:"binding_id"`
	RawObservationID uuid.UUID      `json:"raw_observation_id"`
	OccurredAt       time.Time      `json:"occurred_at"`
	ReceivedAt       time.Time      `json:"received_at"`
	Payload          map[string]any `json:"payload,omitempty"`
}

type EvidenceCanonicalObservation struct {
	ID              uuid.UUID      `json:"id"`
	ObservationType string         `json:"observation_type"`
	OccurredAt      time.Time      `json:"occurred_at"`
	Fields          map[string]any `json:"fields"`
	Source          EvidenceSource `json:"source"`
}

type EvidenceSignal struct {
	SignalID              uuid.UUID                      `json:"signal_id"`
	SignalType            string                         `json:"signal_type"`
	Value                 float64                        `json:"value"`
	DerivedAt             time.Time                      `json:"derived_at"`
	RuleID                string                         `json:"rule_id"`
	DerivationConfidence  float64                        `json:"derivation_confidence"`
	CanonicalObservations []EvidenceCanonicalObservation `json:"canonical_observations"`
}

type TraitEvidenceResponse struct {
	Trait      string                         `json:"trait"`
	Value      float64                        `json:"value"`
	Confidence metric.ConfidenceInterval      `json:"confidence"`
	Evidence   metric.EvidenceDensity         `json:"evidence"`
	Construct  *metric.ConstructRegisterEntry `json:"construct,omitempty"`
	Claims     []metric.ConstructClaim        `json:"claims"`
	Signals    []EvidenceSignal               `json:"signals"`
	AsOf       time.Time                      `json:"as_of"`
}

type StreamActivityObservation struct {
	ID              uuid.UUID      `json:"id"`
	Connector       string         `json:"connector"`
	ObservationType string         `json:"observation_type"`
	OccurredAt      time.Time      `json:"occurred_at"`
	ReceivedAt      *time.Time     `json:"received_at,omitempty"`
	Fields          map[string]any `json:"fields,omitempty"`
}

func (s *MetricService) ListJobsWithCriteria(ctx context.Context, learnerInstitutionID *uuid.UUID) ([]JobWithCriteria, error) {
	jobs, err := s.jobRepo.ListActiveForInstitution(ctx, learnerInstitutionID)
	if err != nil {
		return nil, err
	}
	rewardIDs := make([]string, 0, len(jobs))
	for _, job := range jobs {
		rewardIDs = append(rewardIDs, job.RewardSystemID)
	}
	rewardSystems, err := metric.LoadRewardSystemsByIDs(ctx, s.rewardRepo, rewardIDs)
	if err != nil {
		return nil, err
	}
	out := make([]JobWithCriteria, 0, len(jobs))
	for _, job := range jobs {
		rs, ok := rewardSystems[job.RewardSystemID]
		if !ok {
			return nil, fmt.Errorf("reward system not found: %s", job.RewardSystemID)
		}
		out = append(out, toJobWithCriteria(job, rs))
	}
	return out, nil
}

func (s *MetricService) GetJobWithCriteria(ctx context.Context, jobID uuid.UUID, learnerInstitutionID *uuid.UUID) (*JobWithCriteria, error) {
	job, err := s.jobRepo.GetByID(ctx, jobID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrJobNotFound
		}
		return nil, err
	}
	if !jobVisibleToLearner(job, learnerInstitutionID) {
		return nil, ErrJobNotFound
	}
	if job.TargetKind != model.JobTargetKindJob {
		return nil, ErrJobNotFound
	}
	rs, err := metric.LoadRewardSystem(ctx, s.rewardRepo, job.RewardSystemID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("reward system not found: %s", job.RewardSystemID)
		}
		return nil, err
	}
	jc := toJobWithCriteria(*job, rs)
	return &jc, nil
}

func toJobWithCriteria(job model.Job, rs metric.RewardSystem) JobWithCriteria {
	return JobWithCriteria{
		ID:             job.ID,
		Title:          job.Title,
		CompanyName:    job.CompanyName,
		Subtitle:       job.Subtitle,
		ExternalURL:    job.ExternalURL,
		RewardSystemID: job.RewardSystemID,
		Status:         job.Status,
		Criteria:       toJobRewardCriteria(rs),
	}
}

func (s *MetricService) ListUserTraits(ctx context.Context, userID uuid.UUID, asOf time.Time) ([]UserTraitSummary, error) {
	rows, _, err := s.estimateRepo.LatestByUser(ctx, userID, asOf)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []UserTraitSummary{}, nil
		}
		return nil, err
	}
	estimates, err := parseEstimateRows(rows)
	if err != nil {
		return nil, err
	}
	out := make([]UserTraitSummary, 0, len(estimates))
	for trait, estimate := range estimates {
		out = append(out, UserTraitSummary{
			Trait:      trait,
			Value:      estimate.Value,
			Confidence: estimate.Confidence,
			Evidence:   estimate.Evidence,
			AsOf:       asOf,
		})
	}
	return out, nil
}

func (s *MetricService) ListUserStreamActivity(ctx context.Context, userID uuid.UUID, asOf time.Time) ([]StreamActivityObservation, error) {
	rows, err := s.canonicalRepo.ListByUserBeforeWithRaw(ctx, userID, asOf)
	if err != nil {
		return nil, err
	}
	const maxActivity = 200
	out := make([]StreamActivityObservation, 0, min(len(rows), maxActivity))
	for _, row := range rows {
		if len(out) >= maxActivity {
			break
		}
		connector := ""
		var receivedAt time.Time
		if row.RawObservation.ID != uuid.Nil {
			connector = row.RawObservation.SourceConnector
			receivedAt = row.RawObservation.ReceivedAt
		}
		if connector == "" {
			continue
		}
		fields := map[string]any{}
		if len(row.Fields) > 0 {
			_ = json.Unmarshal(row.Fields, &fields)
		}
		item := StreamActivityObservation{
			ID:              row.ID,
			Connector:       connector,
			ObservationType: row.ObservationType,
			OccurredAt:      row.OccurredAt,
			Fields:          fields,
		}
		if !receivedAt.IsZero() {
			t := receivedAt
			item.ReceivedAt = &t
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *MetricService) GetUserJobFit(ctx context.Context, userID, jobID uuid.UUID, asOf time.Time, learnerInstitutionID *uuid.UUID) (*JobFitResponse, error) {
	job, err := s.jobRepo.GetByID(ctx, jobID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrJobNotFound
		}
		return nil, err
	}
	if !jobVisibleToLearner(job, learnerInstitutionID) {
		return nil, ErrJobNotFound
	}
	if job.TargetKind != model.JobTargetKindJob {
		return nil, ErrJobNotFound
	}

	result, err := s.ComputeJobFit(ctx, userID, jobID, asOf, "api:compute-job-fit")
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrJobNotFound
		}
		return nil, err
	}
	return buildJobFitResponse(result), nil
}

func (s *MetricService) ListUserJobFits(ctx context.Context, userID uuid.UUID, asOf time.Time, learnerInstitutionID *uuid.UUID) ([]JobFitResponse, error) {
	jobs, err := s.jobRepo.ListActiveForInstitution(ctx, learnerInstitutionID)
	if err != nil {
		return nil, err
	}
	if len(jobs) == 0 {
		return []JobFitResponse{}, nil
	}

	rewardIDs := make([]string, 0, len(jobs))
	seen := make(map[string]struct{}, len(jobs))
	for _, job := range jobs {
		if _, ok := seen[job.RewardSystemID]; ok {
			continue
		}
		seen[job.RewardSystemID] = struct{}{}
		rewardIDs = append(rewardIDs, job.RewardSystemID)
	}
	rewardSystems, err := metric.LoadRewardSystemsByIDs(ctx, s.rewardRepo, rewardIDs)
	if err != nil {
		return nil, err
	}

	estimateRows, _, err := s.estimateRepo.LatestByUser(ctx, userID, asOf)
	derived := false
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	estimates, err := parseEstimateRows(estimateRows)
	if err != nil {
		return nil, err
	}
	if len(estimates) == 0 {
		_, estimates, ensureErr := s.EnsureUserTraits(ctx, userID, asOf, "metric:auto-ensure-user-traits")
		if ensureErr != nil {
			return nil, ensureErr
		}
		derived = true
		if len(estimates) == 0 {
			return nil, fmt.Errorf("no construct estimates generated for user %s", userID.String())
		}
	}

	out := make([]JobFitResponse, 0, len(jobs))
	persistScores := make([]rewardScorePersist, 0, len(jobs))
	seenRewardPersist := make(map[string]struct{}, len(jobs))
	for i := range jobs {
		job := &jobs[i]
		rs, ok := rewardSystems[job.RewardSystemID]
		if !ok {
			return nil, fmt.Errorf("reward system not found: %s", job.RewardSystemID)
		}
		score, readings := metric.ScoreRewardSystem(rs, estimates, userID)
		// One reward_scores row per reward system (unique on run_id + user + system).
		if _, seen := seenRewardPersist[rs.ID]; !seen {
			seenRewardPersist[rs.ID] = struct{}{}
			persistScores = append(persistScores, rewardScorePersist{
				RewardSystemID: rs.ID,
				Score:          score,
				Readings:       readings,
			})
		}
		result := &JobFitResult{
			JobID:         job.ID,
			JobTitle:      job.Title,
			AsOf:          asOf,
			RewardID:      rs.ID,
			MetricWeights: rs.MetricWeights,
			Score:         score,
			Readings:      readings,
			Estimates:     estimates,
			WasDerived:    derived,
		}
		out = append(out, *buildJobFitResponse(result))
	}

	if _, err := s.persistFitMetricRun(
		ctx,
		userID,
		asOf,
		"api:list-user-job-fits",
		len(estimates),
		persistScores,
	); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *MetricService) GetTraitEvidence(ctx context.Context, userID uuid.UUID, trait string, asOf time.Time) (*TraitEvidenceResponse, error) {
	rows, _, err := s.estimateRepo.LatestByUser(ctx, userID, asOf)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTraitNotFound
		}
		return nil, err
	}
	estimates, err := parseEstimateRows(rows)
	if err != nil {
		return nil, err
	}
	estimate, ok := estimates[trait]
	if !ok {
		return nil, ErrTraitNotFound
	}

	register, err := metric.LoadConstructRegister(ctx, s.registerRepo)
	if err != nil {
		return nil, err
	}
	var constructEntry *metric.ConstructRegisterEntry
	for _, entry := range register.Entries {
		if entry.Trait == trait {
			copy := entry
			constructEntry = &copy
			break
		}
	}

	claimRows, err := s.claimRepo.ListByTrait(ctx, trait)
	if err != nil {
		return nil, err
	}
	claims := make([]metric.ConstructClaim, 0, len(claimRows))
	for _, row := range claimRows {
		var claim metric.ConstructClaim
		if err := json.Unmarshal(row.Spec, &claim); err != nil {
			return nil, err
		}
		claim.SignalType = row.SignalType
		claim.Trait = row.Trait
		claims = append(claims, claim)
	}

	signalIDs := estimate.DerivedFrom
	signals, err := s.signalRepo.GetByIDs(ctx, signalIDs)
	if err != nil {
		return nil, err
	}
	signalObsRows, err := s.signalObsRepo.ListBySignalIDs(ctx, signalIDs)
	if err != nil {
		return nil, err
	}

	canonicalIDSet := make(map[uuid.UUID]struct{})
	for _, sig := range signals {
		ids, decErr := metric.DecodeDerivedFrom(sig.DerivedFrom)
		if decErr != nil {
			return nil, decErr
		}
		for _, id := range ids {
			canonicalIDSet[id] = struct{}{}
		}
	}
	for _, link := range signalObsRows {
		canonicalIDSet[link.CanonicalObservationID] = struct{}{}
	}
	canonicalIDs := make([]uuid.UUID, 0, len(canonicalIDSet))
	for id := range canonicalIDSet {
		canonicalIDs = append(canonicalIDs, id)
	}
	canonicalRows, err := s.canonicalRepo.GetByIDsWithRaw(ctx, canonicalIDs)
	if err != nil {
		return nil, err
	}
	canonicalByID := make(map[uuid.UUID]model.CanonicalObservation, len(canonicalRows))
	for _, row := range canonicalRows {
		canonicalByID[row.ID] = row
	}

	signalObsBySignal := make(map[uuid.UUID][]uuid.UUID)
	for _, link := range signalObsRows {
		signalObsBySignal[link.SignalID] = append(signalObsBySignal[link.SignalID], link.CanonicalObservationID)
	}

	evidenceSignals := make([]EvidenceSignal, 0, len(signals))
	for _, sig := range signals {
		value, valErr := metric.ExtractSignalValue(sig.Value)
		if valErr != nil {
			return nil, valErr
		}
		derivedFrom, decErr := metric.DecodeDerivedFrom(sig.DerivedFrom)
		if decErr != nil {
			return nil, decErr
		}
		canonicalForSignal := uniqueUUIDs(append(derivedFrom, signalObsBySignal[sig.ID]...))
		evidenceSignals = append(evidenceSignals, EvidenceSignal{
			SignalID:              sig.ID,
			SignalType:            sig.SignalType,
			Value:                 value,
			DerivedAt:             sig.DerivedAt,
			RuleID:                sig.RuleID,
			DerivationConfidence:  sig.DerivationConfidence,
			CanonicalObservations: toEvidenceCanonicalObservations(canonicalForSignal, canonicalByID),
		})
	}

	return &TraitEvidenceResponse{
		Trait:      trait,
		Value:      estimate.Value,
		Confidence: estimate.Confidence,
		Evidence:   estimate.Evidence,
		Construct:  constructEntry,
		Claims:     claims,
		Signals:    evidenceSignals,
		AsOf:       asOf,
	}, nil
}

func toJobRewardCriteria(rs metric.RewardSystem) JobRewardCriteria {
	weightSum := 0.0
	for _, w := range rs.MetricWeights {
		weightSum += w
	}
	metrics := make([]JobCriteriaMetric, 0, len(rs.Metrics))
	for _, def := range rs.Metrics {
		metrics = append(metrics, JobCriteriaMetric{
			MetricID:   def.MetricID,
			Trait:      def.Trait,
			Weight:     rs.MetricWeights[def.MetricID],
			Kind:       def.Kind,
			Shape:      def.Shape,
			Peak:       def.Peak,
			Pole:       def.Pole,
			Components: def.Components,
		})
	}
	label := rs.Label
	if label == "" {
		label = rs.ID
	}
	return JobRewardCriteria{
		ID:        rs.ID,
		Label:     label,
		Version:   rs.Version,
		WeightSum: weightSum,
		Metrics:   metrics,
	}
}

func buildJobFitResponse(result *JobFitResult) *JobFitResponse {
	fitPercent := math.Round(result.Score.Score*1000) / 10

	traits := make([]JobFitTraitReading, 0, len(result.Readings))
	missingTraits := make([]string, 0)
	for metricID, reading := range result.Readings {
		traitName := metricID
		if reading.Kind == metric.MetricKindReflective && len(reading.Components) == 1 {
			for t := range reading.Components {
				traitName = t
			}
		}
		weight := result.MetricWeights[metricID]
		traitValue := 0.0
		if estimate, ok := result.Estimates[traitName]; ok {
			traitValue = estimate.Value
		}
		missing := len(reading.Missing) > 0 || !reading.Usable
		if missing && traitName != "" {
			missingTraits = append(missingTraits, traitName)
		}
		contribution := 0.0
		if reading.Usable {
			contribution = reading.Value * weight
		}
		traits = append(traits, JobFitTraitReading{
			Trait:        traitName,
			MetricID:     metricID,
			Weight:       weight,
			TraitValue:   traitValue,
			MetricValue:  reading.Value,
			Usable:       reading.Usable,
			Contribution: contribution,
			Missing:      missing,
		})
	}

	return &JobFitResponse{
		JobID:             result.JobID,
		JobTitle:          result.JobTitle,
		RewardSystemID:    result.RewardID,
		AsOf:              result.AsOf,
		FitPercent:        fitPercent,
		Score:             result.Score.Score,
		RawScore:          result.Score.RawScore,
		WeightSum:         result.Score.WeightSum,
		Confidence:        result.Score.Confidence,
		SuppressedMetrics: result.Score.Suppressed,
		Traits:            traits,
		MissingTraits:     missingTraits,
		TraitsAutoRefresh: result.WasDerived,
	}
}

func toEvidenceCanonicalObservations(ids []uuid.UUID, canonicalByID map[uuid.UUID]model.CanonicalObservation) []EvidenceCanonicalObservation {
	out := make([]EvidenceCanonicalObservation, 0, len(ids))
	for _, id := range ids {
		row, ok := canonicalByID[id]
		if !ok {
			continue
		}
		fields := jsonObject(row.Fields)
		source := EvidenceSource{
			BindingID:  row.BindingID,
			OccurredAt: row.OccurredAt,
		}
		if row.RawObservation.ID != uuid.Nil {
			source.Connector = row.RawObservation.SourceConnector
			source.EventType = row.RawObservation.SourceEventType
			source.RawObservationID = row.RawObservation.ID
			source.ReceivedAt = row.RawObservation.ReceivedAt
			source.Payload = jsonObject(row.RawObservation.Payload)
		}
		out = append(out, EvidenceCanonicalObservation{
			ID:              row.ID,
			ObservationType: row.ObservationType,
			OccurredAt:      row.OccurredAt,
			Fields:          fields,
			Source:          source,
		})
	}
	return out
}

func jsonObject(raw model.JSONB) map[string]any {
	if len(raw) == 0 {
		return nil
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil
	}
	return out
}

func uniqueUUIDs(ids []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(ids))
	out := make([]uuid.UUID, 0, len(ids))
	for _, id := range ids {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

func jobVisibleToLearner(job *model.Job, learnerInstitutionID *uuid.UUID) bool {
	if learnerInstitutionID == nil {
		return true
	}
	if job.InstitutionID == nil {
		return true
	}
	return *job.InstitutionID == *learnerInstitutionID
}
