package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/metric"
	"github.com/profiler/backend/internal/model"
	"github.com/profiler/backend/internal/repository"
	"github.com/profiler/backend/internal/xint"
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
	Email      string               `json:"email"`
	Status     string               `json:"status"`
	FitPercent *float64             `json:"fit_percent,omitempty"`
	Score      *float64             `json:"score,omitempty"`
	Traits     []BatchFitTraitScore `json:"traits,omitempty"`
	UserID     *uuid.UUID           `json:"user_id,omitempty"`
	ProfileURL *string              `json:"profile_url,omitempty"`
	Error      *string              `json:"error,omitempty"`
}

type BatchFitTraitScore struct {
	Trait               string  `json:"trait"`
	Weight              float64 `json:"weight"`
	TraitPercent        float64 `json:"trait_percent"`
	FitPercent          float64 `json:"fit_percent"`
	ContributionPercent float64 `json:"contribution_percent"`
	Usable              bool    `json:"usable"`
	Missing             bool    `json:"missing"`
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
	linkSigner *xint.ProfileLinkSigner
}

func NewBatchFitService(
	jobRepo *repository.JobRepository,
	userRepo *repository.UserRepository,
	rewardRepo *repository.RewardSystemRepository,
	metricSvc *MetricService,
	linkSigner *xint.ProfileLinkSigner,
) *BatchFitService {
	return &BatchFitService{
		jobRepo:    jobRepo,
		userRepo:   userRepo,
		rewardRepo: rewardRepo,
		metricSvc:  metricSvc,
		linkSigner: linkSigner,
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
	if job.Status != "active" {
		return nil, ErrJobNotFound
	}

	rewardSystem, err := metric.LoadRewardSystem(ctx, s.rewardRepo, job.RewardSystemID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("reward system not found: %s", job.RewardSystemID)
		}
		return nil, err
	}

	usersByEmail, err := s.userRepo.MapIDsByEmails(ctx, req.Emails)
	if err != nil {
		return nil, err
	}

	results := make([]BatchFitResultRow, 0, len(req.Emails))
	summary := BatchFitSummary{Requested: len(req.Emails)}
	for _, requestedEmail := range req.Emails {
		normalizedEmail := repository.NormalizeEmail(requestedEmail)
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
		row.Traits = buildBatchFitTraitScores(fitResult)
		if job.TargetKind == model.JobTargetKindProject && sourceApp == "projex" {
			if s.linkSigner == nil {
				return nil, fmt.Errorf("project-fit profile link signer is not configured")
			}
			_, profileURL, linkErr := s.linkSigner.Issue(job.ID, userID, sourceApp)
			if linkErr != nil {
				return nil, fmt.Errorf("issue project-fit profile link: %w", linkErr)
			}
			profileUserID := userID
			row.UserID = &profileUserID
			row.ProfileURL = &profileURL
		}
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

func buildBatchFitTraitScores(result *JobFitResult) []BatchFitTraitScore {
	readings := buildJobFitResponse(result).Traits
	traits := make([]BatchFitTraitScore, 0, len(readings))
	for _, reading := range readings {
		contributionPercent := 0.0
		if result.Score.WeightSum > 0 {
			contributionPercent = reading.Contribution / result.Score.WeightSum * 100
		}
		traits = append(traits, BatchFitTraitScore{
			Trait:               reading.Trait,
			Weight:              reading.Weight,
			TraitPercent:        roundFitPercent(reading.TraitValue),
			FitPercent:          roundFitPercent(reading.MetricValue),
			ContributionPercent: math.Round(contributionPercent*10) / 10,
			Usable:              reading.Usable,
			Missing:             reading.Missing,
		})
	}
	sort.Slice(traits, func(i, j int) bool {
		return traits[i].Trait < traits[j].Trait
	})
	return traits
}

func roundFitPercent(value float64) float64 {
	return math.Round(value*1000) / 10
}
