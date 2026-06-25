# Entity Relationship Diagram

Full schema for the `profiles` PostgreSQL database (21 tables).

## Platform & Ingestion

```
erDiagram

    INSTITUTIONS ||--o{ INSTITUTION_USERS : has
    INSTITUTIONS ||--o{ DATA_SOURCES : owns
    INSTITUTIONS ||--o{ LEARNERS : has
    INSTITUTIONS ||--o{ RAW_RECORDS : scopes

    CONNECTOR_DEFINITIONS ||--o{ DATA_SOURCES : powers

    DATA_SOURCES ||--|| CONNECTOR_CREDENTIALS : uses
    DATA_SOURCES ||--o{ SCHEMA_SNAPSHOTS : discovers
    DATA_SOURCES ||--o{ DATA_SOURCE_ENTITIES : exposes
    DATA_SOURCES ||--o{ MAPPING_DEFINITIONS : maps
    DATA_SOURCES ||--o{ SYNC_JOBS : executes
    DATA_SOURCES ||--o{ RAW_RECORDS : imports
    DATA_SOURCES ||--o{ LEARNER_IDENTITIES : source

    SYNC_JOBS ||--o{ RAW_RECORDS : creates

    INSTITUTIONS {
        uuid id PK
        varchar name
        varchar type
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    INSTITUTION_USERS {
        uuid id PK
        uuid institution_id FK
        varchar name
        varchar email
        varchar role
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    CONNECTOR_DEFINITIONS {
        uuid id PK
        varchar name
        varchar slug
        varchar type
        varchar version
        timestamp created_at
        timestamp updated_at
    }

    DATA_SOURCES {
        uuid id PK
        uuid institution_id FK
        uuid connector_definition_id FK
        varchar name
        varchar status
        timestamp last_sync_at
        timestamp created_at
        timestamp updated_at
    }

    CONNECTOR_CREDENTIALS {
        uuid id PK
        uuid data_source_id FK
        jsonb encrypted_payload
        timestamp created_at
        timestamp updated_at
    }

    SCHEMA_SNAPSHOTS {
        uuid id PK
        uuid data_source_id FK
        int version
        jsonb schema_json
        timestamp created_at
    }

    DATA_SOURCE_ENTITIES {
        uuid id PK
        uuid data_source_id FK
        varchar source_name
        varchar source_type
        varchar target_domain
        timestamp created_at
        timestamp updated_at
    }

    MAPPING_DEFINITIONS {
        uuid id PK
        uuid data_source_id FK
        varchar target_domain
        jsonb mapping_json
        boolean approved
        timestamp created_at
        timestamp updated_at
    }

    SYNC_JOBS {
        uuid id PK
        uuid data_source_id FK
        varchar status
        int records_processed
        int records_failed
        timestamp started_at
        timestamp completed_at
        text error_message
        timestamp created_at
    }

    RAW_RECORDS {
        uuid id PK
        uuid institution_id FK
        uuid data_source_id FK
        uuid sync_job_id FK
        varchar entity_type
        varchar external_id
        jsonb payload
        timestamp created_at
    }
```

## Learner Layer

```
erDiagram

    INSTITUTIONS ||--o{ LEARNERS : has

    LEARNERS ||--o{ LEARNER_IDENTITIES : resolved_by

    DATA_SOURCES ||--o{ LEARNER_IDENTITIES : source

    LEARNERS {
        uuid id PK
        uuid institution_id FK
        varchar canonical_learner_id
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    LEARNER_IDENTITIES {
        uuid id PK
        uuid learner_id FK
        uuid data_source_id FK
        varchar external_id
        varchar external_type
        timestamp created_at
    }
```
