package database

import (
	_ "embed"
	"encoding/json"
	"time"

	"github.com/profiler/backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

//go:embed catalog/signal_types.json
var signalTypesSeedJSON []byte

//go:embed catalog/derivation_rules.json
var derivationRulesSeedJSON []byte

//go:embed catalog/construct_claims.json
var constructClaimsSeedJSON []byte

type signalTypeSeed struct {
	SignalType string          `json:"signal_type"`
	Version    string          `json:"version"`
	Spec       json.RawMessage `json:"spec"`
}

type derivationRuleSeed struct {
	RuleID           string          `json:"rule_id"`
	Version          string          `json:"version"`
	Primitive        string          `json:"primitive"`
	OutputSignalType string          `json:"output_signal_type"`
	Status           string          `json:"status"`
	Spec             json.RawMessage `json:"spec"`
}

type constructClaimSeed struct {
	ClaimID    string          `json:"claim_id"`
	Version    string          `json:"version"`
	SignalType string          `json:"signal_type"`
	Trait      string          `json:"trait"`
	Spec       json.RawMessage `json:"spec"`
}

func seedSignalCatalog(db *gorm.DB) error {
	if err := seedSignalTypes(db); err != nil {
		return err
	}
	if err := seedDerivationRules(db); err != nil {
		return err
	}
	return seedConstructClaims(db)
}

func seedSignalTypes(db *gorm.DB) error {
	var seeds []signalTypeSeed
	if err := json.Unmarshal(signalTypesSeedJSON, &seeds); err != nil {
		return err
	}

	now := time.Now().UTC()
	rows := make([]model.SignalTypeRegistry, 0, len(seeds))
	for _, seed := range seeds {
		rows = append(rows, model.SignalTypeRegistry{
			SignalType: seed.SignalType,
			Version:    seed.Version,
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
			"version", "spec", "updated_at",
		}),
	}).Create(&rows).Error
}

func seedDerivationRules(db *gorm.DB) error {
	var seeds []derivationRuleSeed
	if err := json.Unmarshal(derivationRulesSeedJSON, &seeds); err != nil {
		return err
	}

	now := time.Now().UTC()
	rows := make([]model.DerivationRuleRegistry, 0, len(seeds))
	for _, seed := range seeds {
		rows = append(rows, model.DerivationRuleRegistry{
			RuleID:           seed.RuleID,
			Version:          seed.Version,
			Primitive:        seed.Primitive,
			OutputSignalType: seed.OutputSignalType,
			Status:           seed.Status,
			Spec:             model.JSONB(seed.Spec),
			CreatedAt:        now,
			UpdatedAt:        now,
		})
	}
	if len(rows) == 0 {
		return nil
	}

	return db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "rule_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"version", "primitive", "output_signal_type", "status", "spec", "updated_at",
		}),
	}).Create(&rows).Error
}

func seedConstructClaims(db *gorm.DB) error {
	var seeds []constructClaimSeed
	if err := json.Unmarshal(constructClaimsSeedJSON, &seeds); err != nil {
		return err
	}

	now := time.Now().UTC()
	rows := make([]model.ConstructClaimRegistry, 0, len(seeds))
	for _, seed := range seeds {
		rows = append(rows, model.ConstructClaimRegistry{
			ClaimID:    seed.ClaimID,
			Version:    seed.Version,
			SignalType: seed.SignalType,
			Trait:      seed.Trait,
			Spec:       model.JSONB(seed.Spec),
			CreatedAt:  now,
			UpdatedAt:  now,
		})
	}
	if len(rows) == 0 {
		return nil
	}

	return db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "claim_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"version", "signal_type", "trait", "spec", "updated_at",
		}),
	}).Create(&rows).Error
}
