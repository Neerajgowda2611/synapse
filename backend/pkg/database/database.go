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

	if err := dropLegacyTables(db); err != nil {
		return nil, err
	}

	if err := ensureConnectorTables(db); err != nil {
		return nil, err
	}

	if err := seedConnectorDefinitions(db); err != nil {
		return nil, err
	}

	if err := seedObservationCatalog(db); err != nil {
		return nil, err
	}

	if err := seedSignalCatalog(db); err != nil {
		return nil, err
	}

	if err := seedMetricCatalog(db); err != nil {
		return nil, err
	}

	if err := ensureObservationIndexes(db); err != nil {
		return nil, err
	}

	return db, nil
}

func migrate(db *gorm.DB) error {
	// Core platform tables only. Observation-layer tables (user_identities,
	// binding_registry, canonical_observations) are created in ensureConnectorTables
	// via raw SQL — AutoMigrate would follow FKs into data_sources/connector_definitions
	// and conflict with manually named indexes.
	return db.AutoMigrate(
		&model.Institution{},
		&model.User{},
		&model.UserRole{},
	)
}

func dropLegacyTables(db *gorm.DB) error {
	statements := []string{
		`DROP TABLE IF EXISTS learner_identities CASCADE`,
		`DROP TABLE IF EXISTS learners CASCADE`,
		`ALTER TABLE user_roles DROP COLUMN IF EXISTS learner_id`,
		// Leftover from an old migration tool; schema is managed in code now.
		`DROP TABLE IF EXISTS schema_migrations CASCADE`,
	}
	for _, stmt := range statements {
		if err := db.Exec(stmt).Error; err != nil {
			return err
		}
	}
	return nil
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
		`ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS raw_storage_consent_at timestamptz`,
		`ALTER TABLE data_sources ADD COLUMN IF NOT EXISTS raw_storage_consented_by text`,
		`CREATE TABLE IF NOT EXISTS sync_jobs (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			data_source_id uuid NOT NULL,
			status text NOT NULL,
			records_processed integer NOT NULL DEFAULT 0,
			records_failed integer NOT NULL DEFAULT 0,
			started_at timestamptz,
			completed_at timestamptz,
			error_message text,
			created_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_sync_jobs_data_source_id ON sync_jobs (data_source_id)`,
		`CREATE TABLE IF NOT EXISTS raw_records (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			institution_id uuid NOT NULL,
			data_source_id uuid NOT NULL,
			sync_job_id uuid,
			entity_type text NOT NULL,
			external_id text,
			payload jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_raw_records_data_source_id ON raw_records (data_source_id)`,
		`CREATE INDEX IF NOT EXISTS idx_raw_records_data_source_entity ON raw_records (data_source_id, entity_type)`,
		`CREATE INDEX IF NOT EXISTS idx_raw_records_sync_job_id ON raw_records (sync_job_id)`,
		// observations — Stage 1 observation dump (webhook envelope at ingest)
		`CREATE TABLE IF NOT EXISTS observations (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			data_source_id uuid NOT NULL,
			source_id text NOT NULL,
			idempotency_key text NOT NULL,
			source_connector text NOT NULL,
			source_event_type text NOT NULL,
			ingestion_altitude text NOT NULL,
			occurred_at timestamptz NOT NULL,
			received_at timestamptz NOT NULL,
			payload jsonb NOT NULL,
			payload_schema jsonb,
			description text,
			attestation jsonb,
			status text NOT NULL DEFAULT 'received',
			observation_type text,
			domain text,
			binding_id text,
			binding_version text,
			quarantine_reason text,
			created_at timestamptz NOT NULL DEFAULT now()
		)`,
		`ALTER TABLE observations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'received'`,
		`ALTER TABLE observations ADD COLUMN IF NOT EXISTS observation_type text`,
		`ALTER TABLE observations ADD COLUMN IF NOT EXISTS domain text`,
		`ALTER TABLE observations ADD COLUMN IF NOT EXISTS binding_id text`,
		`ALTER TABLE observations ADD COLUMN IF NOT EXISTS binding_version text`,
		`ALTER TABLE observations ADD COLUMN IF NOT EXISTS quarantine_reason text`,
		`ALTER TABLE observations ADD COLUMN IF NOT EXISTS shape_signature text`,
		`ALTER TABLE observations ADD COLUMN IF NOT EXISTS processing_started_at timestamptz`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_observations_idempotency ON observations (data_source_id, idempotency_key)`,
		`CREATE INDEX IF NOT EXISTS idx_observations_data_source_id ON observations (data_source_id)`,
		`CREATE INDEX IF NOT EXISTS idx_observations_connector_event ON observations (data_source_id, source_connector, source_event_type)`,
		`CREATE INDEX IF NOT EXISTS idx_observations_status ON observations (data_source_id, status)`,
		`CREATE INDEX IF NOT EXISTS idx_observations_shape_signature ON observations (shape_signature)`,
		`CREATE TABLE IF NOT EXISTS user_identities (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			user_id uuid NOT NULL,
			data_source_id uuid NOT NULL,
			external_id text NOT NULL,
			namespace text,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_user_identities_user FOREIGN KEY (user_id) REFERENCES users(id),
			CONSTRAINT fk_user_identities_data_source FOREIGN KEY (data_source_id) REFERENCES data_sources(id)
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identities_source_external ON user_identities (data_source_id, external_id)`,
		`CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities (user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_user_identities_namespace ON user_identities (namespace)`,
		`CREATE TABLE IF NOT EXISTS observation_type_registry (
			observation_type text PRIMARY KEY,
			version text NOT NULL DEFAULT '1.0.0',
			fields jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS binding_registry (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			binding_id text NOT NULL UNIQUE,
			source_connector text NOT NULL,
			source_event_type text NOT NULL,
			observation_type text NOT NULL,
			spec jsonb NOT NULL,
			status text NOT NULL DEFAULT 'candidate',
			version integer NOT NULL DEFAULT 1,
			proposed_by text,
			sample_observation_ids jsonb,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_binding_registry_lookup ON binding_registry (source_connector, source_event_type, status)`,
		`CREATE TABLE IF NOT EXISTS canonical_observations (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			raw_observation_id uuid NOT NULL,
			observation_type text NOT NULL,
			user_id uuid NOT NULL,
			fields jsonb NOT NULL,
			binding_id text NOT NULL,
			binding_version integer NOT NULL DEFAULT 1,
			occurred_at timestamptz NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_canonical_raw_observation FOREIGN KEY (raw_observation_id) REFERENCES observations(id),
			CONSTRAINT fk_canonical_user FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_canonical_observations_raw_id ON canonical_observations (raw_observation_id)`,
		`CREATE INDEX IF NOT EXISTS idx_canonical_observations_user_id ON canonical_observations (user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_canonical_observations_type ON canonical_observations (observation_type)`,
		`CREATE TABLE IF NOT EXISTS signal_type_registry (
			signal_type text PRIMARY KEY,
			version text NOT NULL DEFAULT '1.0.0',
			spec jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS derivation_rule_registry (
			rule_id text PRIMARY KEY,
			version text NOT NULL DEFAULT '1.0.0',
			primitive text NOT NULL,
			output_signal_type text NOT NULL,
			status text NOT NULL DEFAULT 'candidate',
			spec jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_derivation_rule_registry_status ON derivation_rule_registry (status)`,
		`CREATE TABLE IF NOT EXISTS derivation_runs (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			as_of timestamptz NOT NULL,
			user_id uuid,
			n_signals integer NOT NULL DEFAULT 0,
			n_skips integer NOT NULL DEFAULT 0,
			notes text,
			created_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_derivation_runs_user FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_derivation_runs_as_of ON derivation_runs (as_of)`,
		`CREATE INDEX IF NOT EXISTS idx_derivation_runs_user_id ON derivation_runs (user_id)`,
		`CREATE TABLE IF NOT EXISTS signals (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			run_id uuid NOT NULL,
			signal_type text NOT NULL,
			user_id uuid NOT NULL,
			value jsonb NOT NULL,
			domain text,
			derived_at timestamptz NOT NULL,
			inference_method text NOT NULL DEFAULT 'rule',
			derived_from jsonb NOT NULL DEFAULT '[]'::jsonb,
			rule_id text NOT NULL,
			rule_version text NOT NULL DEFAULT '1.0.0',
			derivation_confidence double precision NOT NULL DEFAULT 1,
			created_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_signals_run FOREIGN KEY (run_id) REFERENCES derivation_runs(id) ON DELETE CASCADE,
			CONSTRAINT fk_signals_user FOREIGN KEY (user_id) REFERENCES users(id),
			CONSTRAINT fk_signals_signal_type FOREIGN KEY (signal_type) REFERENCES signal_type_registry(signal_type),
			CONSTRAINT fk_signals_rule FOREIGN KEY (rule_id) REFERENCES derivation_rule_registry(rule_id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_signals_user_type ON signals (user_id, signal_type)`,
		`CREATE INDEX IF NOT EXISTS idx_signals_derived_at ON signals (derived_at)`,
		`CREATE TABLE IF NOT EXISTS derivation_skips (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			run_id uuid NOT NULL,
			rule_id text NOT NULL,
			output_signal_type text NOT NULL,
			user_id uuid,
			reason text NOT NULL,
			observation_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
			created_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_derivation_skips_run FOREIGN KEY (run_id) REFERENCES derivation_runs(id) ON DELETE CASCADE,
			CONSTRAINT fk_derivation_skips_user FOREIGN KEY (user_id) REFERENCES users(id)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_derivation_skips_user_rule ON derivation_skips (user_id, rule_id)`,
		`CREATE TABLE IF NOT EXISTS signal_observations (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			signal_id uuid NOT NULL,
			canonical_observation_id uuid NOT NULL,
			rule_id text,
			created_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_signal_observations_signal FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE CASCADE,
			CONSTRAINT fk_signal_observations_canonical FOREIGN KEY (canonical_observation_id) REFERENCES canonical_observations(id) ON DELETE CASCADE
		)`,
		`ALTER TABLE signal_observations ADD COLUMN IF NOT EXISTS rule_id text`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_signal_observations_unique ON signal_observations (signal_id, canonical_observation_id)`,
		`CREATE INDEX IF NOT EXISTS idx_signal_observations_canonical_rule ON signal_observations (canonical_observation_id, rule_id)`,
		`CREATE TABLE IF NOT EXISTS construct_claim_registry (
			claim_id text PRIMARY KEY,
			version text NOT NULL DEFAULT '1.0.0',
			signal_type text NOT NULL,
			trait text NOT NULL,
			spec jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_construct_claim_signal_type FOREIGN KEY (signal_type) REFERENCES signal_type_registry(signal_type)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_construct_claim_registry_signal_type ON construct_claim_registry (signal_type)`,
		`CREATE INDEX IF NOT EXISTS idx_construct_claim_registry_trait ON construct_claim_registry (trait)`,
		`CREATE TABLE IF NOT EXISTS construct_register (
			construct_id text PRIMARY KEY,
			trait text NOT NULL,
			family text NOT NULL,
			version text NOT NULL DEFAULT '0.1.0',
			spec jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_construct_register_trait ON construct_register (trait)`,
		`CREATE TABLE IF NOT EXISTS metric_norm (
			signal_type text PRIMARY KEY,
			spec jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_metric_norm_signal_type FOREIGN KEY (signal_type) REFERENCES signal_type_registry(signal_type)
		)`,
		`CREATE TABLE IF NOT EXISTS reward_system (
			id text PRIMARY KEY,
			version text NOT NULL DEFAULT '0.1.0',
			label text,
			spec jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now()
		)`,
		`CREATE TABLE IF NOT EXISTS jobs (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			title text NOT NULL,
			reward_system_id text NOT NULL,
			institution_id uuid,
			source_app text,
			xint_source_ref text,
			target_kind text NOT NULL DEFAULT 'job',
			company_name text,
			subtitle text,
			external_url text,
			created_by uuid,
			status text NOT NULL DEFAULT 'active',
			created_at timestamptz NOT NULL DEFAULT now(),
			updated_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT chk_jobs_target_kind CHECK (target_kind IN ('job', 'career_profile', 'project')),
			CONSTRAINT fk_jobs_reward_system FOREIGN KEY (reward_system_id) REFERENCES reward_system(id) ON DELETE RESTRICT,
			CONSTRAINT fk_jobs_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL,
			CONSTRAINT fk_jobs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
		)`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS institution_id uuid`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_app text`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS xint_source_ref text`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_kind text NOT NULL DEFAULT 'job'`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_name text`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS subtitle text`,
		`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_url text`,
		`UPDATE jobs SET target_kind = 'career_profile' WHERE xint_source_ref LIKE 'placement:career_profile:%'`,
		`UPDATE jobs SET target_kind = 'project' WHERE xint_source_ref LIKE 'projex:project:%'`,
		`DO $$ BEGIN
			ALTER TABLE jobs ADD CONSTRAINT chk_jobs_target_kind CHECK (target_kind IN ('job', 'career_profile', 'project'));
		EXCEPTION WHEN duplicate_object THEN NULL;
		END $$`,
		`CREATE INDEX IF NOT EXISTS idx_jobs_reward_system_id ON jobs (reward_system_id)`,
		`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status)`,
		`CREATE INDEX IF NOT EXISTS idx_jobs_institution_id ON jobs (institution_id)`,
		`CREATE INDEX IF NOT EXISTS idx_jobs_target_kind ON jobs (target_kind)`,
		// Full unique index (not partial) so ON CONFLICT (source_app, xint_source_ref) works.
		// Seeded jobs keep both columns NULL; Postgres allows multiple NULL pairs.
		`DROP INDEX IF EXISTS idx_jobs_xint_source`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_xint_source ON jobs (source_app, xint_source_ref)`,
		`CREATE TABLE IF NOT EXISTS metric_runs (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			derivation_run_id uuid,
			as_of timestamptz NOT NULL,
			user_id uuid NOT NULL,
			n_estimates integer NOT NULL DEFAULT 0,
			n_scores integer NOT NULL DEFAULT 0,
			notes text,
			created_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_metric_runs_derivation_run FOREIGN KEY (derivation_run_id) REFERENCES derivation_runs(id) ON DELETE SET NULL,
			CONSTRAINT fk_metric_runs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_metric_runs_user_as_of ON metric_runs (user_id, as_of DESC)`,
		`CREATE TABLE IF NOT EXISTS construct_estimates (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			run_id uuid NOT NULL,
			user_id uuid NOT NULL,
			trait text NOT NULL,
			value double precision NOT NULL,
			ci_lower double precision NOT NULL,
			ci_upper double precision NOT NULL,
			n_effective double precision NOT NULL,
			spec jsonb NOT NULL,
			created_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_construct_estimates_run FOREIGN KEY (run_id) REFERENCES metric_runs(id) ON DELETE CASCADE,
			CONSTRAINT fk_construct_estimates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_construct_estimates_run_user_trait ON construct_estimates (run_id, user_id, trait)`,
		`CREATE INDEX IF NOT EXISTS idx_construct_estimates_user_trait ON construct_estimates (user_id, trait)`,
		`CREATE TABLE IF NOT EXISTS reward_scores (
			id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
			run_id uuid NOT NULL,
			user_id uuid NOT NULL,
			reward_system_id text NOT NULL,
			score double precision NOT NULL,
			ci_lower double precision NOT NULL,
			ci_upper double precision NOT NULL,
			spec jsonb NOT NULL,
			readings jsonb NOT NULL DEFAULT '{}'::jsonb,
			created_at timestamptz NOT NULL DEFAULT now(),
			CONSTRAINT fk_reward_scores_run FOREIGN KEY (run_id) REFERENCES metric_runs(id) ON DELETE CASCADE,
			CONSTRAINT fk_reward_scores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			CONSTRAINT fk_reward_scores_reward_system FOREIGN KEY (reward_system_id) REFERENCES reward_system(id) ON DELETE RESTRICT
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_scores_run_user_system ON reward_scores (run_id, user_id, reward_system_id)`,
		`CREATE INDEX IF NOT EXISTS idx_reward_scores_user_system ON reward_scores (user_id, reward_system_id)`,
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
		VALUES
			('PostgreSQL', 'postgres', 'database', 'v1', now(), now()),
			('Webhook', 'webhook', 'push', 'v1', now(), now())
		ON CONFLICT (slug) DO UPDATE
		SET name = EXCLUDED.name,
			type = EXCLUDED.type,
			version = EXCLUDED.version,
			updated_at = now()
	`).Error
}

func ensureObservationIndexes(db *gorm.DB) error {
	// Remove duplicate canonical rows (e.g. from pre-claim races) before unique index.
	if err := db.Exec(`
		DELETE FROM canonical_observations
		WHERE id NOT IN (
			SELECT DISTINCT ON (raw_observation_id) id
			FROM canonical_observations
			ORDER BY raw_observation_id, created_at ASC, id ASC
		)
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_observations_raw_id_unique ON canonical_observations (raw_observation_id)`).Error; err != nil {
		return err
	}
	if err := db.Exec(`CREATE INDEX IF NOT EXISTS idx_observations_status_received_at ON observations (status, received_at)`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		UPDATE signal_observations so
		SET rule_id = s.rule_id
		FROM signals s
		WHERE so.signal_id = s.id
		  AND (so.rule_id IS NULL OR so.rule_id = '')
	`).Error; err != nil {
		return err
	}
	if err := db.Exec(`
		DELETE FROM signal_observations so
		USING (
			SELECT id
			FROM (
				SELECT id,
				       ROW_NUMBER() OVER (
				         PARTITION BY canonical_observation_id, rule_id
				         ORDER BY created_at ASC, id ASC
				       ) AS rn
				FROM signal_observations
				WHERE rule_id IS NOT NULL AND rule_id <> ''
			) ranked
			WHERE ranked.rn > 1
		) dup
		WHERE so.id = dup.id
	`).Error; err != nil {
		return err
	}
	return db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_signal_observations_canonical_rule_unique
		ON signal_observations (canonical_observation_id, rule_id)
		WHERE rule_id IS NOT NULL AND rule_id <> ''
	`).Error
}
