package database

import (
	_ "embed"
	"encoding/json"
	"time"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

//go:embed catalog/observation_types.json
var observationTypesSeedJSON []byte

//go:embed catalog/bindings.json
var bindingsSeedJSON []byte

type observationTypeSeed struct {
	ObservationType string          `json:"observation_type"`
	Version         string          `json:"version"`
	Fields          json.RawMessage `json:"fields"`
}

type bindingSeed struct {
	BindingID       string          `json:"binding_id"`
	SourceConnector string          `json:"source_connector"`
	SourceEventType string          `json:"source_event_type"`
	ObservationType string          `json:"observation_type"`
	Status          string          `json:"status"`
	Version         int             `json:"version"`
	Spec            json.RawMessage `json:"spec"`
}

func seedObservationCatalog(db *gorm.DB) error {
	if err := seedObservationTypes(db); err != nil {
		return err
	}
	return seedBindings(db)
}

func seedObservationTypes(db *gorm.DB) error {
	var seeds []observationTypeSeed
	if err := json.Unmarshal(observationTypesSeedJSON, &seeds); err != nil {
		return err
	}

	now := time.Now().UTC()
	rows := make([]model.ObservationTypeRegistry, 0, len(seeds))
	for _, seed := range seeds {
		rows = append(rows, model.ObservationTypeRegistry{
			ObservationType: seed.ObservationType,
			Version:         seed.Version,
			Fields:          model.JSONB(seed.Fields),
			CreatedAt:       now,
			UpdatedAt:       now,
		})
	}

	return db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "observation_type"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"version", "fields", "updated_at",
		}),
	}).Create(&rows).Error
}

func seedBindings(db *gorm.DB) error {
	var seeds []bindingSeed
	if err := json.Unmarshal(bindingsSeedJSON, &seeds); err != nil {
		return err
	}

	now := time.Now().UTC()
	rows := make([]model.BindingRegistry, 0, len(seeds))
	for _, seed := range seeds {
		rows = append(rows, model.BindingRegistry{
			BindingID:       seed.BindingID,
			SourceConnector: seed.SourceConnector,
			SourceEventType: seed.SourceEventType,
			ObservationType: seed.ObservationType,
			Spec:            model.JSONB(seed.Spec),
			Status:          seed.Status,
			Version:         seed.Version,
			CreatedAt:       now,
			UpdatedAt:       now,
		})
	}

	return db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "binding_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"source_connector", "source_event_type", "observation_type",
			"spec", "status", "version", "updated_at",
		}),
	}).Create(&rows).Error
}
