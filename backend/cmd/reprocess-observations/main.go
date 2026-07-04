package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/profiler/backend/configs"
	"github.com/profiler/backend/internal/logs"
	"github.com/profiler/backend/internal/repository"
	"github.com/profiler/backend/internal/service"
	"github.com/profiler/backend/pkg/database"
)

func main() {
	configPath := flag.String("config", "", "path to .env file")
	sourceConnector := flag.String("connector", "vtu_placements", "source_connector to reprocess")
	flag.Parse()

	logs.New()

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

	observationSvc := service.NewObservationService(
		repository.NewObservationRepository(db),
		repository.NewBindingRegistryRepository(db),
		repository.NewObservationTypeRegistryRepository(db),
		repository.NewCanonicalObservationRepository(db),
		repository.NewUserRepository(db),
		repository.NewUserIdentityRepository(db),
	)

	count, err := observationSvc.ReprocessQuarantinedByConnector(context.Background(), *sourceConnector)
	if err != nil {
		fmt.Fprintf(os.Stderr, "reprocess: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("reprocessed %d quarantined observations for connector %q\n", count, *sourceConnector)
}
