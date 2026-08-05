package database

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/profiler/backend/internal/logs"
	"gorm.io/gorm"
)

const profilingCatalogSeedKey = "profiling_catalog"

// catalogSeedFingerprint is a stable hash of the embedded rulebook JSON.
// Changing any catalog file changes the hash and triggers a reseed on next boot.
func catalogSeedFingerprint() string {
	h := sha256.New()
	parts := [][]byte{
		observationTypesSeedJSON,
		bindingsSeedJSON,
		signalTypesSeedJSON,
		derivationRulesSeedJSON,
		constructClaimsSeedJSON,
		constructRegisterSeedJSON,
		metricNormsSeedJSON,
		rewardSystemsSeedJSON,
		jobsSeedJSON,
	}
	for _, part := range parts {
		_, _ = h.Write(part)
		_, _ = h.Write([]byte{0})
	}
	return hex.EncodeToString(h.Sum(nil))
}

func ensureSchemaSeedMeta(db *gorm.DB) error {
	return db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_seed_meta (
			seed_key text PRIMARY KEY,
			content_hash text NOT NULL,
			updated_at timestamptz NOT NULL DEFAULT now()
		)
	`).Error
}

func profilingCatalogNeedsSeed(db *gorm.DB, hash string) (bool, error) {
	var stored string
	if err := db.Raw(
		`SELECT content_hash FROM schema_seed_meta WHERE seed_key = ?`,
		profilingCatalogSeedKey,
	).Scan(&stored).Error; err != nil {
		return false, err
	}
	if stored != hash {
		return true, nil
	}

	// Safety: if hash matches but the catalog was wiped, reseed.
	var count int64
	if err := db.Raw(`SELECT COUNT(*) FROM observation_type_registry`).Scan(&count).Error; err != nil {
		return false, err
	}
	return count == 0, nil
}

func markProfilingCatalogSeeded(db *gorm.DB, hash string) error {
	return db.Exec(`
		INSERT INTO schema_seed_meta (seed_key, content_hash, updated_at)
		VALUES (?, ?, now())
		ON CONFLICT (seed_key) DO UPDATE
		SET content_hash = EXCLUDED.content_hash,
		    updated_at = now()
	`, profilingCatalogSeedKey, hash).Error
}

// seedProfilingCatalogIfNeeded upserts observation/signal/metric catalogs only when
// the embedded JSON rulebook changed (or the catalog tables are empty).
func seedProfilingCatalogIfNeeded(db *gorm.DB) error {
	if err := ensureSchemaSeedMeta(db); err != nil {
		return fmt.Errorf("schema_seed_meta: %w", err)
	}

	hash := catalogSeedFingerprint()
	needed, err := profilingCatalogNeedsSeed(db, hash)
	if err != nil {
		return err
	}
	if !needed {
		logs.Info("profiling catalog seed unchanged — skipping rewrite", "hash", hash[:12])
		return nil
	}

	logs.Info("profiling catalog seed changed — applying rulebook", "hash", hash[:12])

	if err := seedObservationCatalog(db); err != nil {
		return err
	}
	if err := seedSignalCatalog(db); err != nil {
		return err
	}
	if err := seedMetricCatalog(db); err != nil {
		return err
	}
	return markProfilingCatalogSeeded(db, hash)
}
