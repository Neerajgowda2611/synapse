# Database Model

Schema as deployed in PostgreSQL (`profiles` database). Generated from live `information_schema` introspection.

## Overview

The database is divided into three major areas:

```
Platform Layer
├── institutions
├── institution_users
├── connector_definitions
├── data_sources
└── connector_credentials

Ingestion Layer
├── schema_snapshots
├── data_source_entities
├── mapping_definitions
├── sync_jobs
└── raw_records

Learner Layer
├── learners
└── learner_identities
```

---

## institutions

Organizations using the platform.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| name | varchar | NO | |
| type | varchar | YES | |
| status | varchar | NO | 'active' |
| created_at | timestamp | NO | now() |
| updated_at | timestamp | NO | now() |

**Referenced by:** `institution_users`, `data_sources`, `learners`, `raw_records`

---

## institution_users

Users belonging to an institution.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| institution_id | uuid | NO | → institutions.id |
| name | varchar | NO | |
| email | varchar | NO | |
| role | varchar | NO | |
| status | varchar | NO | 'active' |
| created_at | timestamp | NO | now() |
| updated_at | timestamp | NO | now() |

---

## connector_definitions

Master catalog of supported connector types (e.g. PostgreSQL, Google Sheets, Moodle).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| name | varchar | NO | |
| slug | varchar | NO | |
| type | varchar | NO | |
| version | varchar | NO | 'v1' |
| created_at | timestamp | NO | now() |
| updated_at | timestamp | NO | now() |

**Referenced by:** `data_sources`

---

## data_sources

External systems connected by an institution.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| institution_id | uuid | NO | → institutions.id |
| connector_definition_id | uuid | NO | → connector_definitions.id |
| name | varchar | NO | |
| status | varchar | NO | 'active' |
| last_sync_at | timestamp | YES | |
| created_at | timestamp | NO | now() |
| updated_at | timestamp | NO | now() |

**Referenced by:** `connector_credentials`, `schema_snapshots`, `data_source_entities`, `mapping_definitions`, `sync_jobs`, `raw_records`, `learner_identities`

---

## connector_credentials

Encrypted credentials for a data source. One row per data source.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| data_source_id | uuid | NO | → data_sources.id |
| encrypted_payload | jsonb | NO | |
| created_at | timestamp | NO | now() |
| updated_at | timestamp | NO | now() |

---

## schema_snapshots

Discovered source schemas, used for manual and AI mapping.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| data_source_id | uuid | NO | → data_sources.id |
| version | integer | NO | |
| schema_json | jsonb | NO | |
| created_at | timestamp | NO | now() |

---

## data_source_entities

Discovered source entities mapped to CPS domains.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| data_source_id | uuid | NO | → data_sources.id |
| source_name | varchar | NO | |
| source_type | varchar | NO | |
| target_domain | varchar | YES | |
| created_at | timestamp | NO | now() |
| updated_at | timestamp | NO | now() |

---

## mapping_definitions

Approved mappings between source fields and CPS fields.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| data_source_id | uuid | NO | → data_sources.id |
| target_domain | varchar | NO | |
| mapping_json | jsonb | NO | |
| approved | boolean | NO | false |
| created_at | timestamp | NO | now() |
| updated_at | timestamp | NO | now() |

---

## sync_jobs

Synchronization execution records.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| data_source_id | uuid | NO | → data_sources.id |
| status | varchar | NO | |
| records_processed | integer | NO | 0 |
| records_failed | integer | NO | 0 |
| started_at | timestamp | YES | |
| completed_at | timestamp | YES | |
| error_message | text | YES | |
| created_at | timestamp | NO | now() |

**Referenced by:** `raw_records`

---

## raw_records

Imported source records stored as-is for audit, history, and reprocessing. Records should not be modified.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| institution_id | uuid | NO | → institutions.id |
| data_source_id | uuid | NO | → data_sources.id |
| sync_job_id | uuid | YES | → sync_jobs.id |
| entity_type | varchar | NO | |
| external_id | varchar | YES | |
| payload | jsonb | NO | |
| created_at | timestamp | NO | now() |

---

## learners

Canonical learner entity. Every profile domain row belongs to one learner.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| institution_id | uuid | NO | → institutions.id |
| canonical_learner_id | varchar | YES | |
| status | varchar | NO | 'active' |
| created_at | timestamp | NO | now() |
| updated_at | timestamp | NO | now() |

**Referenced by:** `learner_identities`

---

## learner_identities

Identity resolution: maps external system IDs to a canonical learner.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| learner_id | uuid | NO | → learners.id |
| data_source_id | uuid | NO | → data_sources.id |
| external_id | varchar | NO | |
| external_type | varchar | YES | |
| created_at | timestamp | NO | now() |
