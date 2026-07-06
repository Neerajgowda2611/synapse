package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/configs"
	"github.com/profiler/backend/internal/metric"
	"github.com/profiler/backend/internal/repository"
	"github.com/profiler/backend/internal/service"
	"github.com/profiler/backend/pkg/database"
)

func main() {
	configPath := flag.String("config", "", "path to .env file")
	userIDRaw := flag.String("user-id", "", "user UUID to score")
	jobIDRaw := flag.String("job-id", "", "job UUID to score fit for")
	asOfRaw := flag.String("as-of", "", "optional RFC3339 as-of time (defaults now)")
	traitsOnly := flag.Bool("traits-only", false, "only compute and persist trait estimates")
	flag.Parse()

	if *userIDRaw == "" {
		fmt.Fprintln(os.Stderr, "--user-id is required")
		os.Exit(1)
	}
	userID, err := uuid.Parse(*userIDRaw)
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid --user-id: %v\n", err)
		os.Exit(1)
	}

	asOf := time.Now().UTC()
	if *asOfRaw != "" {
		asOf, err = time.Parse(time.RFC3339, *asOfRaw)
		if err != nil {
			fmt.Fprintf(os.Stderr, "invalid --as-of: %v\n", err)
			os.Exit(1)
		}
	}

	if !*traitsOnly && *jobIDRaw == "" {
		fmt.Fprintln(os.Stderr, "--job-id is required unless --traits-only is set")
		os.Exit(1)
	}

	cfg, err := configs.Load(*configPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "config: %v\n", err)
		os.Exit(1)
	}
	db, err := database.InitDB(cfg.DatabaseURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "db: %v\n", err)
		os.Exit(1)
	}

	metricSvc := service.NewMetricService(
		repository.NewSignalRepository(db),
		repository.NewSignalObservationRepository(db),
		repository.NewCanonicalObservationRepository(db),
		repository.NewConstructClaimRegistryRepository(db),
		repository.NewConstructRegisterRepository(db),
		repository.NewMetricNormRepository(db),
		repository.NewRewardSystemRepository(db),
		repository.NewJobRepository(db),
		repository.NewMetricRunRepository(db),
		repository.NewConstructEstimateRepository(db),
		repository.NewRewardScoreRepository(db),
	)

	ctx := context.Background()
	if *traitsOnly {
		run, estimates, err := metricSvc.EnsureUserTraits(ctx, userID, asOf.UTC(), "cli:build-metric-traits")
		if err != nil {
			fmt.Fprintf(os.Stderr, "traits: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("traits refreshed for user %s as_of=%s run_id=%s estimates=%d\n", userID.String(), asOf.UTC().Format(time.RFC3339), run.ID.String(), len(estimates))
		printTraitSummary(estimates)
		return
	}

	jobID, err := uuid.Parse(*jobIDRaw)
	if err != nil {
		fmt.Fprintf(os.Stderr, "invalid --job-id: %v\n", err)
		os.Exit(1)
	}
	result, err := metricSvc.ComputeJobFit(ctx, userID, jobID, asOf.UTC(), "cli:build-metric-fit")
	if err != nil {
		fmt.Fprintf(os.Stderr, "fit: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf(
		"fit computed user=%s job=%s (%s) role=%s fit=%.1f%% raw=%.3f weight_sum=%.1f metrics_used=%d suppressed=%d ci=[%.3f, %.3f] run_id=%s derived_traits=%t\n",
		userID.String(),
		result.JobID.String(),
		result.JobTitle,
		result.RewardID,
		result.Score.Score*100.0,
		result.Score.RawScore,
		result.Score.WeightSum,
		len(result.Score.MetricValues),
		len(result.Score.Suppressed),
		result.Score.Confidence.Lower,
		result.Score.Confidence.Upper,
		result.MetricRun.ID.String(),
		result.WasDerived,
	)
}

func printTraitSummary(estimates map[string]metric.ConstructEstimate) {
	traits := make([]string, 0, len(estimates))
	for trait := range estimates {
		traits = append(traits, trait)
	}
	sort.Strings(traits)
	for _, trait := range traits {
		estimate := estimates[trait]
		fmt.Printf("  trait=%s value=%.3f ci=[%.3f, %.3f] n_eff=%.2f\n",
			trait,
			estimate.Value,
			estimate.Confidence.Lower,
			estimate.Confidence.Upper,
			estimate.Evidence.NEffective,
		)
	}
}
