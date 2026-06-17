package database

import (
	"errors"
	"time"

	"github.com/profiler/backend/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func InitDB(databaseURL string) (*gorm.DB, error) {
	if databaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}

	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		return nil, err
	}

	if err := ensureUUIDExtension(db); err != nil {
		return nil, err
	}

	if err := migrate(db); err != nil {
		return nil, err
	}

	if err := ensureConnectorTables(db); err != nil {
		return nil, err
	}

	if err := seedConnectorDefinitions(db); err != nil {
		return nil, err
	}

	return db, nil
}

func migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.Institution{},
		&model.User{},
		&model.UserRole{},
		&model.Learner{},
	)
}

func ensureUUIDExtension(db *gorm.DB) error {
	return db.Exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).Error
}

func ensureConnectorTables(db *gorm.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS connector_definitions (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			name text NOT NULL,
			slug text NOT NULL,
			type text NOT NULL,
			version text NOT NULL DEFAULT 'v1',
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE connector_definitions ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT ''`,
		`ALTER TABLE connector_definitions ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT ''`,
		`ALTER TABLE connector_definitions ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'database'`,
		`ALTER TABLE connector_definitions ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT 'v1'`,
		`ALTER TABLE connector_definitions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
		`ALTER TABLE connector_definitions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_connector_definitions_slug ON connector_definitions (slug)`,
		`CREATE TABLE IF NOT EXISTS data_sources (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			institution_id uuid NOT NULL,
			connector_definition_id uuid NOT NULL,
			name text NOT NULL,
			status text NOT NULL DEFAULT 'active',
			last_sync_at timestamptz,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS institution_id uuid`,
		`ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS connector_definition_id uuid`,
		`ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT ''`,
		`ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'`,
		`ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS last_sync_at timestamptz`,
		`ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
		`ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
		`CREATE INDEX IF NOT EXISTS idx_data_sources_institution_id ON data_sources (institution_id)`,
		`CREATE INDEX IF NOT EXISTS idx_data_sources_connector_definition_id ON data_sources (connector_definition_id)`,
		`CREATE TABLE IF NOT EXISTS connector_credentials (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			data_source_id uuid NOT NULL,
			encrypted_payload jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE connector_credentials ADD COLUMN IF NOT EXISTS data_source_id uuid`,
		`ALTER TABLE connector_credentials ADD COLUMN IF NOT EXISTS encrypted_payload jsonb NOT NULL DEFAULT '{}'::jsonb`,
		`ALTER TABLE connector_credentials ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
		`ALTER TABLE connector_credentials ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_connector_credentials_data_source_id ON connector_credentials (data_source_id)`,
		`CREATE TABLE IF NOT EXISTS schema_snapshots (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			data_source_id uuid NOT NULL,
			version integer NOT NULL,
			schema_json jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE schema_snapshots ADD COLUMN IF NOT EXISTS data_source_id uuid`,
		`ALTER TABLE schema_snapshots ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1`,
		`ALTER TABLE schema_snapshots ADD COLUMN IF NOT EXISTS schema_json jsonb NOT NULL DEFAULT '{}'::jsonb`,
		`ALTER TABLE schema_snapshots ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
		`CREATE INDEX IF NOT EXISTS idx_schema_snapshots_data_source_id ON schema_snapshots (data_source_id)`,
		`CREATE TABLE IF NOT EXISTS data_source_entities (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			data_source_id uuid NOT NULL,
			source_name text NOT NULL,
			source_type text NOT NULL,
			target_domain text,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE data_source_entities ADD COLUMN IF NOT EXISTS data_source_id uuid`,
		`ALTER TABLE data_source_entities ADD COLUMN IF NOT EXISTS source_name text NOT NULL DEFAULT ''`,
		`ALTER TABLE data_source_entities ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'table'`,
		`ALTER TABLE data_source_entities ADD COLUMN IF NOT EXISTS target_domain text`,
		`ALTER TABLE data_source_entities ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`,
		`ALTER TABLE data_source_entities ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
		`CREATE INDEX IF NOT EXISTS idx_data_source_entities_data_source_id ON data_source_entities (data_source_id)`,
	}

	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			return err
		}
	}

	return nil
}

func seedConnectorDefinitions(db *gorm.DB) error {
	return db.Exec(`
		INSERT INTO connector_definitions (name, slug, type, version, created_at, updated_at)
		VALUES ('PostgreSQL', 'postgres', 'database', 'v1', now(), now())
		ON CONFLICT (slug) DO UPDATE
		SET name = EXCLUDED.name,
			type = EXCLUDED.type,
			version = EXCLUDED.version,
			updated_at = now()
	`).Error
}
