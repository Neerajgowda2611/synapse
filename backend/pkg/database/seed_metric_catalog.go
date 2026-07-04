package database

import (
	_ "embed"
	"encoding/json"
	"time"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

//go:embed catalog/construct_register.json
var constructRegisterSeedJSON []byte

//go:embed catalog/metric_norms.json
var metricNormsSeedJSON []byte

//go:embed catalog/reward_systems.json
var rewardSystemsSeedJSON []byte

type constructRegisterSeed struct {
	ConstructID string          `json:"construct_id"`
	Trait       string          `json:"trait"`
	Family      string          `json:"family"`
	Version     string          `json:"version"`
	Spec        json.RawMessage `json:"spec"`
}

type metricNormSeed struct {
	SignalType string          `json:"signal_type"`
	Spec       json.RawMessage `json:"spec"`
}

type rewardSystemSeed struct {
	ID      string          `json:"id"`
	Version string          `json:"version"`
	Label   string          `json:"label"`
	Spec    json.RawMessage `json:"spec"`
}

func seedMetricCatalog(db *gorm.DB) error {
	if err := seedConstructRegister(db); err != nil {
		return err
	}
	if err := seedMetricNorms(db); err != nil {
		return err
	}
	return seedRewardSystems(db)
}

func seedConstructRegister(db *gorm.DB) error {
	var seeds []constructRegisterSeed
	if err := json.Unmarshal(constructRegisterSeedJSON, &seeds); err != nil {
		return err
	}

	now := time.Now().UTC()
	rows := make([]model.ConstructRegister, 0, len(seeds))
	for _, seed := range seeds {
		rows = append(rows, model.ConstructRegister{
			ConstructID: seed.ConstructID,
			Trait:       seed.Trait,
			Family:      seed.Family,
			Version:     seed.Version,
			Spec:        model.JSONB(seed.Spec),
			CreatedAt:   now,
			UpdatedAt:   now,
		})
	}
	if len(rows) == 0 {
		return nil
	}

	return db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "construct_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"trait", "family", "version", "spec", "updated_at",
		}),
	}).Create(&rows).Error
}

func seedMetricNorms(db *gorm.DB) error {
	var seeds []metricNormSeed
	if err := json.Unmarshal(metricNormsSeedJSON, &seeds); err != nil {
		return err
	}

	now := time.Now().UTC()
	rows := make([]model.MetricNorm, 0, len(seeds))
	for _, seed := range seeds {
		rows = append(rows, model.MetricNorm{
			SignalType: seed.SignalType,
			Spec:       model.JSONB(seed.Spec),
			CreatedAt:  now,
			UpdatedAt:  now,
		})
	}
	if len(rows) == 0 {
		return nil
	}

	return db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "signal_type"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"spec", "updated_at",
		}),
	}).Create(&rows).Error
}

func seedRewardSystems(db *gorm.DB) error {
	var seeds []rewardSystemSeed
	if err := json.Unmarshal(rewardSystemsSeedJSON, &seeds); err != nil {
		return err
	}

	now := time.Now().UTC()
	rows := make([]model.RewardSystem, 0, len(seeds))
	for _, seed := range seeds {
		var label *string
		if seed.Label != "" {
			label = &seed.Label
		}
		rows = append(rows, model.RewardSystem{
			ID:        seed.ID,
			Version:   seed.Version,
			Label:     label,
			Spec:      model.JSONB(seed.Spec),
			CreatedAt: now,
			UpdatedAt: now,
		})
	}
	if len(rows) == 0 {
		return nil
	}

	return db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"version", "label", "spec", "updated_at",
		}),
	}).Create(&rows).Error
}
