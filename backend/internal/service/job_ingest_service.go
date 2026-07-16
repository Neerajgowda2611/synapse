package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/metric"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
	"gorm.io/gorm"
)

var (
	ErrInvalidIngestPayload = errors.New("invalid ingest payload")
	ErrUnknownTrait         = errors.New("unknown trait")
)

type IngestJobRequest struct {
	XintSourceRef string            `json:"xint_source_ref"`
	InstitutionID *uuid.UUID        `json:"institution_id,omitempty"`
	Title         string            `json:"title"`
	CompanyName   *string           `json:"company_name,omitempty"`
	Subtitle      *string           `json:"subtitle,omitempty"`
	ExternalURL   *string           `json:"external_url,omitempty"`
	Status        string            `json:"status"`
	Criteria      IngestJobCriteria `json:"criteria"`
}

type IngestJobCriteria struct {
	Label  string              `json:"label"`
	Traits []IngestTraitWeight `json:"traits"`
}

type IngestTraitWeight struct {
	Trait  string   `json:"trait"`
	Weight float64  `json:"weight"`
	Shape  *string  `json:"shape,omitempty"`
	Pole   *string  `json:"pole,omitempty"`
	Peak   *float64 `json:"peak,omitempty"`
}

type IngestJobResult struct {
	JobID          uuid.UUID           `json:"job_id"`
	RewardSystemID string              `json:"reward_system_id"`
	SourceApp      string              `json:"source_app"`
	XintSourceRef  string              `json:"xint_source_ref"`
	TargetKind     model.JobTargetKind `json:"target_kind"`
	Created        bool                `json:"created"`
}

type XintTrait struct {
	ConstructID string `json:"construct_id"`
	Trait       string `json:"trait"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type JobIngestService struct {
	db              *gorm.DB
	jobRepo         *repository.JobRepository
	rewardRepo      *repository.RewardSystemRepository
	institutionRepo *repository.InstitutionRepository
	registerRepo    *repository.ConstructRegisterRepository
}

func NewJobIngestService(
	db *gorm.DB,
	jobRepo *repository.JobRepository,
	rewardRepo *repository.RewardSystemRepository,
	institutionRepo *repository.InstitutionRepository,
	registerRepo *repository.ConstructRegisterRepository,
) *JobIngestService {
	return &JobIngestService{
		db:              db,
		jobRepo:         jobRepo,
		rewardRepo:      rewardRepo,
		institutionRepo: institutionRepo,
		registerRepo:    registerRepo,
	}
}

func (s *JobIngestService) UpsertJob(ctx context.Context, sourceApp string, req IngestJobRequest) (*IngestJobResult, error) {
	sourceApp = strings.TrimSpace(sourceApp)
	if sourceApp == "" {
		return nil, fmt.Errorf("%w: source app is required", ErrInvalidIngestPayload)
	}
	if strings.TrimSpace(req.Status) == "" {
		req.Status = "active"
	}
	req.XintSourceRef = strings.TrimSpace(req.XintSourceRef)
	req.Title = strings.TrimSpace(req.Title)
	req.CompanyName = trimOptionalString(req.CompanyName)
	req.Subtitle = trimOptionalString(req.Subtitle)
	req.ExternalURL = trimOptionalString(req.ExternalURL)
	for i := range req.Criteria.Traits {
		req.Criteria.Traits[i].Trait = strings.TrimSpace(req.Criteria.Traits[i].Trait)
	}
	if err := validateIngestRequest(req); err != nil {
		return nil, err
	}
	targetKind, err := inferTargetKind(sourceApp, req.XintSourceRef)
	if err != nil {
		return nil, err
	}

	if req.InstitutionID != nil {
		if _, err := s.institutionRepo.GetByID(ctx, *req.InstitutionID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrInstitutionNotFound
			}
			return nil, err
		}
	}

	validTraits, err := s.loadValidTraits(ctx)
	if err != nil {
		return nil, err
	}
	for _, t := range req.Criteria.Traits {
		if _, ok := validTraits[t.Trait]; !ok {
			return nil, fmt.Errorf("%w: %s", ErrUnknownTrait, t.Trait)
		}
	}

	rewardSystemID := rewardSystemIDForIngest(sourceApp, req.XintSourceRef)
	rewardSpec, err := buildIngestRewardSystem(rewardSystemID, sourceApp, req)
	if err != nil {
		return nil, err
	}
	specJSON, err := json.Marshal(rewardSpec)
	if err != nil {
		return nil, err
	}

	label := strings.TrimSpace(req.Criteria.Label)
	if label == "" {
		label = strings.TrimSpace(req.Title)
	}

	existing, existingErr := s.jobRepo.GetByXintSource(ctx, sourceApp, req.XintSourceRef)
	created := errors.Is(existingErr, gorm.ErrRecordNotFound)
	if existingErr != nil && !created {
		return nil, existingErr
	}

	now := time.Now().UTC()
	sourceAppCopy := sourceApp
	xintRefCopy := req.XintSourceRef

	job := &model.Job{
		Title:          strings.TrimSpace(req.Title),
		CompanyName:    req.CompanyName,
		Subtitle:       req.Subtitle,
		ExternalURL:    req.ExternalURL,
		RewardSystemID: rewardSystemID,
		InstitutionID:  req.InstitutionID,
		SourceApp:      &sourceAppCopy,
		XintSourceRef:  &xintRefCopy,
		TargetKind:     targetKind,
		Status:         strings.TrimSpace(req.Status),
		UpdatedAt:      now,
	}
	if !created {
		job.ID = existing.ID
		job.CreatedAt = existing.CreatedAt
	} else {
		job.CreatedAt = now
	}

	rewardRow := &model.RewardSystem{
		ID:        rewardSystemID,
		Version:   "0.1.0",
		Label:     &label,
		Spec:      model.JSONB(specJSON),
		UpdatedAt: now,
	}
	if created {
		rewardRow.CreatedAt = now
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := repository.NewRewardSystemRepository(tx).Upsert(ctx, rewardRow); err != nil {
			return err
		}
		return repository.NewJobRepository(tx).UpsertIngested(ctx, job)
	})
	if err != nil {
		return nil, err
	}

	stored, err := s.jobRepo.GetByXintSource(ctx, sourceApp, req.XintSourceRef)
	if err != nil {
		return nil, err
	}

	return &IngestJobResult{
		JobID:          stored.ID,
		RewardSystemID: rewardSystemID,
		SourceApp:      sourceApp,
		XintSourceRef:  req.XintSourceRef,
		TargetKind:     stored.TargetKind,
		Created:        created,
	}, nil
}

func (s *JobIngestService) LookupJob(ctx context.Context, sourceApp, xintSourceRef string) (*model.Job, error) {
	sourceApp = strings.TrimSpace(sourceApp)
	xintSourceRef = strings.TrimSpace(xintSourceRef)
	if sourceApp == "" || xintSourceRef == "" {
		return nil, fmt.Errorf("%w: source_app and xint_source_ref are required", ErrInvalidIngestPayload)
	}
	job, err := s.jobRepo.GetByXintSource(ctx, sourceApp, xintSourceRef)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrJobNotFound
		}
		return nil, err
	}
	return job, nil
}

func (s *JobIngestService) ListTraits(ctx context.Context) ([]XintTrait, error) {
	rows, err := s.registerRepo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	traits := make([]XintTrait, 0, len(rows))
	for _, row := range rows {
		var spec metric.ConstructRegisterEntry
		if err := json.Unmarshal(row.Spec, &spec); err != nil {
			return nil, fmt.Errorf("decode construct %s: %w", row.ConstructID, err)
		}
		name := strings.TrimSpace(spec.Name)
		if name == "" {
			name = row.Trait
		}
		traits = append(traits, XintTrait{
			ConstructID: row.ConstructID,
			Trait:       row.Trait,
			Name:        name,
			Description: strings.TrimSpace(spec.Definition),
		})
	}
	return traits, nil
}

func validateIngestRequest(req IngestJobRequest) error {
	if req.XintSourceRef == "" {
		return fmt.Errorf("%w: xint_source_ref is required", ErrInvalidIngestPayload)
	}
	if req.InstitutionID != nil && *req.InstitutionID == uuid.Nil {
		return fmt.Errorf("%w: institution_id must be a valid uuid when provided", ErrInvalidIngestPayload)
	}
	if req.Title == "" {
		return fmt.Errorf("%w: title is required", ErrInvalidIngestPayload)
	}
	if req.Status != "active" && req.Status != "inactive" && req.Status != "closed" {
		return fmt.Errorf("%w: status must be active, inactive, or closed", ErrInvalidIngestPayload)
	}
	if req.ExternalURL != nil {
		url := strings.TrimSpace(*req.ExternalURL)
		if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
			return fmt.Errorf("%w: external_url must be an http or https URL", ErrInvalidIngestPayload)
		}
	}
	if len(req.Criteria.Traits) == 0 {
		return fmt.Errorf("%w: at least one trait is required", ErrInvalidIngestPayload)
	}
	seen := make(map[string]struct{}, len(req.Criteria.Traits))
	for _, t := range req.Criteria.Traits {
		if t.Trait == "" {
			return fmt.Errorf("%w: trait name is required", ErrInvalidIngestPayload)
		}
		if t.Weight <= 0 {
			return fmt.Errorf("%w: trait weight must be positive", ErrInvalidIngestPayload)
		}
		if _, dup := seen[t.Trait]; dup {
			return fmt.Errorf("%w: duplicate trait %s", ErrInvalidIngestPayload, t.Trait)
		}
		seen[t.Trait] = struct{}{}
	}
	return nil
}

func inferTargetKind(sourceApp, xintSourceRef string) (model.JobTargetKind, error) {
	sourceApp = strings.TrimSpace(sourceApp)
	xintSourceRef = strings.TrimSpace(xintSourceRef)

	var (
		prefix string
		kind   model.JobTargetKind
	)
	switch {
	case sourceApp == "placement" && strings.HasPrefix(xintSourceRef, "placement:job:"):
		prefix = "placement:job:"
		kind = model.JobTargetKindJob
	case sourceApp == "placement" && strings.HasPrefix(xintSourceRef, "placement:career_profile:"):
		prefix = "placement:career_profile:"
		kind = model.JobTargetKindCareerProfile
	case sourceApp == "projex" && strings.HasPrefix(xintSourceRef, "projex:project:"):
		prefix = "projex:project:"
		kind = model.JobTargetKindProject
	default:
		return "", fmt.Errorf(
			"%w: unsupported xint_source_ref %q for source %q",
			ErrInvalidIngestPayload,
			xintSourceRef,
			sourceApp,
		)
	}
	if strings.TrimSpace(strings.TrimPrefix(xintSourceRef, prefix)) == "" {
		return "", fmt.Errorf("%w: xint_source_ref id is required", ErrInvalidIngestPayload)
	}
	return kind, nil
}

func (s *JobIngestService) loadValidTraits(ctx context.Context) (map[string]struct{}, error) {
	rows, err := s.registerRepo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]struct{}, len(rows))
	for _, row := range rows {
		out[row.Trait] = struct{}{}
	}
	return out, nil
}

func rewardSystemIDForIngest(sourceApp, xintSourceRef string) string {
	ref := strings.TrimSpace(xintSourceRef)
	if strings.HasPrefix(ref, "xint:") {
		return ref
	}
	if strings.Contains(ref, ":") {
		return "xint:" + ref
	}
	return "xint:" + sourceApp + ":" + ref
}

func buildIngestRewardSystem(id, sourceApp string, req IngestJobRequest) (metric.RewardSystem, error) {
	label := strings.TrimSpace(req.Criteria.Label)
	if label == "" {
		label = strings.TrimSpace(req.Title)
	}

	metrics := make([]metric.MetricDefinition, 0, len(req.Criteria.Traits))
	weights := make(map[string]float64, len(req.Criteria.Traits))
	for _, t := range req.Criteria.Traits {
		def := buildIngestMetricDef(t)
		metrics = append(metrics, def)
		weights[def.MetricID] = t.Weight
	}

	return metric.RewardSystem{
		ID:            id,
		Metrics:       metrics,
		MetricWeights: weights,
		Label:         label,
		Owner:         "xint:" + sourceApp,
		Version:       "0.1.0",
	}, nil
}

func buildIngestMetricDef(t IngestTraitWeight) metric.MetricDefinition {
	trait := t.Trait
	shape := metric.MetricShapeMonotonic
	var peak *float64
	var pole *string

	if t.Shape != nil && strings.TrimSpace(*t.Shape) != "" {
		shape = metric.MetricShape(strings.TrimSpace(*t.Shape))
	} else {
		switch trait {
		case "agency":
			shape = metric.MetricShapeBipolar
			pole = strPtr("agency")
		case "risk_appetite":
			shape = metric.MetricShapeBipolar
			pole = strPtr("risk")
		case "help_seeking":
			shape = metric.MetricShapePeaked
			peak = float64Ptr(0.55)
		}
	}
	if t.Pole != nil {
		pole = t.Pole
	}
	if t.Peak != nil {
		peak = t.Peak
	}

	return metric.MetricDefinition{
		MetricID:   trait,
		Kind:       metric.MetricKindReflective,
		Trait:      &trait,
		Components: map[string]float64{},
		Shape:      shape,
		Peak:       peak,
		Pole:       pole,
	}
}

func strPtr(s string) *string {
	return &s
}

func float64Ptr(v float64) *float64 {
	return &v
}

func trimOptionalString(s *string) *string {
	if s == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*s)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
