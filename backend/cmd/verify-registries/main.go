package main

import (
	"fmt"
	"log"
	"os"

	"github.com/profiler/backend/pkg/database"
)

func main() {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := database.InitDB(url)
	if err != nil {
		log.Fatal(err)
	}

	queries := []struct {
		name  string
		query string
	}{
		{"construct_claims", "SELECT count(*) FROM construct_claim_registry"},
		{"construct_register", "SELECT count(*) FROM construct_register"},
		{"metric_norms", "SELECT count(*) FROM metric_norm"},
		{"reward_systems", "SELECT count(*) FROM reward_system"},
	}
	for _, q := range queries {
		var n int64
		if err := db.Raw(q.query).Scan(&n).Error; err != nil {
			log.Fatalf("%s: %v", q.name, err)
		}
		fmt.Printf("%s: %d\n", q.name, n)
	}

	var orphanClaims, orphanNorms int64
	if err := db.Raw(`
		SELECT count(*) FROM construct_claim_registry c
		LEFT JOIN signal_type_registry s ON c.signal_type = s.signal_type
		WHERE s.signal_type IS NULL
	`).Scan(&orphanClaims).Error; err != nil {
		log.Fatal(err)
	}
	if err := db.Raw(`
		SELECT count(*) FROM metric_norm n
		LEFT JOIN signal_type_registry s ON n.signal_type = s.signal_type
		WHERE s.signal_type IS NULL
	`).Scan(&orphanNorms).Error; err != nil {
		log.Fatal(err)
	}
	fmt.Printf("orphan_claims: %d\n", orphanClaims)
	fmt.Printf("orphan_norms: %d\n", orphanNorms)
}
