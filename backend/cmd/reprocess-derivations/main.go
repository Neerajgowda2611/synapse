package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/profiler/backend/configs"
	"github.com/profiler/backend/internal/repository"
	"github.com/profiler/backend/internal/service"
	"github.com/profiler/backend/pkg/database"
)

func main() {
	configPath := flag.String("config", "", "path to .env file")
	userIDRaw := flag.String("user-id", "", "user UUID to re-derive")
	asOfRaw := flag.String("as-of", "", "optional RFC3339 as-of time (defaults now)")
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

	derivationSvc := service.NewDerivationService(
		repository.NewCanonicalObservationRepository(db),
		repository.NewDerivationRuleRegistryRepository(db),
		repository.NewDerivationRunRepository(db),
		repository.NewSignalRepository(db),
		repository.NewDerivationSkipRepository(db),
		repository.NewSignalObservationRepository(db),
	)
	if err := derivationSvc.DeriveForUser(context.Background(), userID, asOf.UTC(), "cli:reprocess-derivations"); err != nil {
		fmt.Fprintf(os.Stderr, "derive: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("derivation reprocess completed for user %s as_of=%s\n", userID.String(), asOf.UTC().Format(time.RFC3339))
}
