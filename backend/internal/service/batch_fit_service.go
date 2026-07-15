package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/metric"
	"github.com/profiler/backend/internal/repository"
	"gorm.io/gorm"
)

const maxBatchFitEmails = 500

var ErrInvalidBatchFitRequest = errors.New("invalid batch fit request")

type BatchFitRequest struct {
	XintSourceRef string     `json:"xint_source_ref"`
	Emails        []string   `json:"emails"`
	AsOf          *time.Time `json:"as_of,omitempty"`
}

type BatchFitResultRow struct {
	Email      string   `json:"email"`
	Status     string   `json:"status"`
	FitPercent *float64 `json:"fit_percent,omitempty"`
	Score      *float64 `json:"score,omitempty"`
	Error      *string  `json:"error,omitempty"`
}

type BatchFitSummary struct {
	Requested   int `json:"requested"`
	Available   int `json:"available"`
	Unavailable int `json:"unavailable"`
	Error       int `json:"error"`
}

type BatchFitResponse struct {
	XintSourceRef string              `json:"xint_source_ref"`
	JobID         uuid.UUID           `json:"job_id"`
	Results       []BatchFitResultRow `json:"results"`
	Summary       BatchFitSummary     `json:"summary"`
}

type BatchFitService struct {
	jobRepo    *repository.JobRepository
	userRepo   *repository.UserRepository
	rewardRepo *repository.RewardSystemRepository
	metricSvc  *MetricService
}

func NewBatchFitService(
	jobRepo *repository.JobRepository,
	userRepo *repository.UserRepository,
	rewardRepo *repository.RewardSystemRepository,
	metricSvc *MetricService,
) *BatchFitService {
	return &BatchFitService{
		jobRepo:    jobRepo,
		userRepo:   userRepo,
		rewardRepo: rewardRepo,
		metricSvc:  metricSvc,
	}
}

func (s *BatchFitService) BatchFitByXintSource(ctx context.Context, sourceApp string, req BatchFitRequest) (*BatchFitResponse, error) {
	sourceApp = strings.TrimSpace(sourceApp)
	req.XintSourceRef = strings.TrimSpace(req.XintSourceRef)
	if sourceApp == "" {
		return nil, fmt.Errorf("%w: source app is required", ErrInvalidBatchFitRequest)
	}
	if req.XintSourceRef == "" {
		return nil, fmt.Errorf("%w: xint_source_ref is required", ErrInvalidBatchFitRequest)
	}
	if len(req.Emails) == 0 {
		return nil, fmt.Errorf("%w: emails are required", ErrInvalidBatchFitRequest)
	}
	if len(req.Emails) > maxBatchFitEmails {
		return nil, fmt.Errorf("%w: emails must contain at most %d items", ErrInvalidBatchFitRequest, maxBatchFitEmails)
	}

	asOf := time.Now().UTC()
	if req.AsOf != nil {
		asOf = req.AsOf.UTC()
	}

	job, err := s.jobRepo.GetByXintSource(ctx, sourceApp, req.XintSourceRef)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrJobNotFound
		}
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

	users, err := s.userRepo.ListByEmails(ctx, req.Emails)
	if err != nil {
		return nil, err
	}
	usersByEmail := make(map[string]uuid.UUID, len(users))
	for _, user := range users {
		usersByEmail[strings.ToLower(strings.TrimSpace(user.Email))] = user.ID
	}

	results := make([]BatchFitResultRow, 0, len(req.Emails))
	summary := BatchFitSummary{Requested: len(req.Emails)}
	for _, requestedEmail := range req.Emails {
		normalizedEmail := strings.ToLower(strings.TrimSpace(requestedEmail))
		row := BatchFitResultRow{
			Email: requestedEmail,
		}
		userID, ok := usersByEmail[normalizedEmail]
		if !ok || normalizedEmail == "" {
			row.Status = "unavailable"
			summary.Unavailable++
			results = append(results, row)
			continue
		}

		fitResult, scoreErr := s.metricSvc.ScoreJobFitForUserWithRewardSystem(ctx, userID, job, rewardSystem, asOf)
		if scoreErr != nil {
			if strings.Contains(scoreErr.Error(), "no construct estimates generated") {
				row.Status = "unavailable"
				summary.Unavailable++
				results = append(results, row)
				continue
			}
			errMsg := scoreErr.Error()
			row.Status = "error"
			row.Error = &errMsg
			summary.Error++
			results = append(results, row)
			continue
		}

		fitPercent := math.Round(fitResult.Score.Score*1000) / 10
		row.Status = "available"
		row.FitPercent = &fitPercent
		row.Score = &fitResult.Score.Score
		summary.Available++
		results = append(results, row)
	}

	return &BatchFitResponse{
		XintSourceRef: req.XintSourceRef,
		JobID:         job.ID,
		Results:       results,
		Summary:       summary,
	}, nil
}
