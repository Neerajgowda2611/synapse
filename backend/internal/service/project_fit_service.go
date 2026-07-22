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

var ErrProjectFitTargetMismatch = errors.New("project-fit target mismatch")

type ProjectFitLearner struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Email string    `json:"email"`
}

type ProjectFitTraitDetail struct {
	Trait               string                    `json:"trait"`
	Weight              float64                   `json:"weight"`
	WeightSharePercent  float64                   `json:"weight_share_percent"`
	TraitPercent        float64                   `json:"trait_percent"`
	FitPercent          float64                   `json:"fit_percent"`
	ContributionPercent float64                   `json:"contribution_percent"`
	Usable              bool                      `json:"usable"`
	Missing             bool                      `json:"missing"`
	Confidence          metric.ConfidenceInterval `json:"confidence"`
	Evidence            metric.EvidenceDensity    `json:"evidence"`
}

type ProjectFitDetailResponse struct {
	TargetID    uuid.UUID                 `json:"target_id"`
	TargetKind  model.JobTargetKind       `json:"target_kind"`
	ProjectName string                    `json:"project_name"`
	SourceRef   string                    `json:"xint_source_ref"`
	Learner     ProjectFitLearner         `json:"learner"`
	AsOf        time.Time                 `json:"as_of"`
	FitPercent  float64                   `json:"fit_percent"`
	Score       float64                   `json:"score"`
	Confidence  metric.ConfidenceInterval `json:"confidence"`
	Traits      []ProjectFitTraitDetail   `json:"traits"`
	Missing     []string                  `json:"missing_traits"`
}

type ProjectFitService struct {
	jobRepo    *repository.JobRepository
	userRepo   *repository.UserRepository
	rewardRepo *repository.RewardSystemRepository
	metricSvc  *MetricService
	linkSigner *xint.ProfileLinkSigner
}

func NewProjectFitService(
	jobRepo *repository.JobRepository,
	userRepo *repository.UserRepository,
	rewardRepo *repository.RewardSystemRepository,
	metricSvc *MetricService,
	linkSigner *xint.ProfileLinkSigner,
) *ProjectFitService {
	return &ProjectFitService{
		jobRepo:    jobRepo,
		userRepo:   userRepo,
		rewardRepo: rewardRepo,
		metricSvc:  metricSvc,
		linkSigner: linkSigner,
	}
}

func (s *ProjectFitService) GetBySignedToken(ctx context.Context, token string) (*ProjectFitDetailResponse, error) {
	if s.linkSigner == nil {
		return nil, xint.ErrInvalidProfileLink
	}
	claims, err := s.linkSigner.Verify(strings.TrimSpace(token))
	if err != nil {
		return nil, err
	}
	if claims.Source != "projex" {
		return nil, ErrProjectFitTargetMismatch
	}

	job, err := s.jobRepo.GetByID(ctx, claims.TargetID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrJobNotFound
		}
		return nil, err
	}
	if job.TargetKind != model.JobTargetKindProject ||
		job.Status != "active" ||
		job.SourceApp == nil ||
		strings.TrimSpace(*job.SourceApp) != claims.Source ||
		job.XintSourceRef == nil {
		return nil, ErrProjectFitTargetMismatch
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}
	rewardSystem, err := metric.LoadRewardSystem(ctx, s.rewardRepo, job.RewardSystemID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("reward system not found: %s", job.RewardSystemID)
		}
		return nil, err
	}

	asOf := time.Now().UTC()
	result, err := s.metricSvc.ScoreJobFitForUserWithRewardSystem(ctx, user.ID, job, rewardSystem, asOf)
	if err != nil {
		return nil, err
	}

	return &ProjectFitDetailResponse{
		TargetID:    job.ID,
		TargetKind:  job.TargetKind,
		ProjectName: job.Title,
		SourceRef:   strings.TrimSpace(*job.XintSourceRef),
		Learner: ProjectFitLearner{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
		},
		AsOf:       asOf,
		FitPercent: roundFitPercent(result.Score.Score),
		Score:      result.Score.Score,
		Confidence: result.Score.Confidence,
		Traits:     buildProjectFitTraitDetails(result),
		Missing:    buildJobFitResponse(result).MissingTraits,
	}, nil
}

func buildProjectFitTraitDetails(result *JobFitResult) []ProjectFitTraitDetail {
	scores := buildBatchFitTraitScores(result)
	details := make([]ProjectFitTraitDetail, 0, len(scores))
	for _, score := range scores {
		weightShare := 0.0
		if result.Score.WeightSum > 0 {
			weightShare = math.Round((score.Weight/result.Score.WeightSum)*1000) / 10
		}
		estimate := result.Estimates[score.Trait]
		details = append(details, ProjectFitTraitDetail{
			Trait:               score.Trait,
			Weight:              score.Weight,
			WeightSharePercent:  weightShare,
			TraitPercent:        score.TraitPercent,
			FitPercent:          score.FitPercent,
			ContributionPercent: score.ContributionPercent,
			Usable:              score.Usable,
			Missing:             score.Missing,
			Confidence:          estimate.Confidence,
			Evidence:            estimate.Evidence,
		})
	}
	sort.Slice(details, func(i, j int) bool {
		if details[i].Weight != details[j].Weight {
			return details[i].Weight > details[j].Weight
		}
		return details[i].Trait < details[j].Trait
	})
	return details
}
