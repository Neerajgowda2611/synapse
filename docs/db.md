# Database Design v1

## Overview

The database is divided into three major areas:

```Platform Layer
├── Institutions
├── Users
├── Connectors
├── Data Sources
└── Mappings

Ingestion Layer
├── Schema Discovery
├── Source Entities
├── Sync Jobs
└── Raw Records

Learner Layer
├── Learners
└── Identity Resolution (learner_identities)
```
---

# institutions

## Purpose

Represents organizations using the platform.

Examples:

- ABC Engineering College
- XYZ University
- Scaler
- UpGrad

## Relationships

```text
institutions
    │
    ├── institution_users
    ├── data_sources
    └── learners

```

## Columns

```text
id
name
type
status
created_at
updated_at

```

---

# institution_users

## Purpose

Represents users belonging to an institution.

Examples:

- Super Admin
- Admin
- Staff

## Relationships

```text
institution_users
    └── institution_id → institutions.id

```

## Columns

```text
id
institution_id
name
email
role
status
created_at
updated_at

```

---

# connector_definitions

## Purpose

Master catalog of supported connector types.

Examples:

- PostgreSQL
- Google Sheets
- Moodle
- ERPNext

## Columns

```text
id
name
slug
type
version
created_at
updated_at

```

---

# data_sources

## Purpose

Represents actual external systems connected by an institution.

Examples:

- ABC College PostgreSQL
- ABC Moodle Instance

## Relationships

```text
institution_id → institutions.id

connector_definition_id
    → connector_definitions.id

```

## Columns

```text
id
institution_id
connector_definition_id
name
status
last_sync_at
created_at
updated_at

```

---

# connector_credentials

## Purpose

Stores encrypted credentials for a data source.

## Relationships

```text
data_source_id → data_sources.id

```

## Columns

```text
id
data_source_id
encrypted_payload
created_at
updated_at

```

---

# schema_snapshots

## Purpose

Stores discovered source schemas.

Used by:

- Manual Mapping
- AI Mapping

## Relationships

```text
data_source_id → data_sources.id

```

## Columns

```text
id
data_source_id
version
schema_json
created_at

```

---

# data_source_entities

## Purpose

Represents discovered source entities and maps them to CPS domains.

Examples:

```text
students
    → identity

academic_records
    → education

payments
    → payments

assessment_results
    → assessments

```

## Relationships

```text
data_source_id → data_sources.id

```

## Columns

```text
id
data_source_id
source_name
source_type
target_domain
created_at
updated_at

```

---

# mapping_definitions

## Purpose

Stores approved mappings between source fields and CPS fields.

Example:

```text
student_name
      ↓
identity.full_name

```

## Relationships

```text
data_source_id → data_sources.id

```

## Columns

```text
id
data_source_id
target_domain
mapping_json
approved
created_at
updated_at

```

---

# sync_jobs

## Purpose

Represents every synchronization execution.

Examples:

- Daily Student Import
- Attendance Sync
- Payment Sync

## Relationships

```text
data_source_id → data_sources.id

```

## Columns

```text
id
data_source_id
status
records_processed
records_failed
started_at
completed_at
error_message
created_at

```

---

# raw_records

## Purpose

Stores imported source records exactly as received.

This table acts as:

- Audit Trail
- Source History
- Reprocessing Source

Records should never be modified.

## Relationships

```text
institution_id → institutions.id

data_source_id → data_sources.id

sync_job_id → sync_jobs.id

```

## Columns

```text
id
institution_id
data_source_id
sync_job_id
entity_type
external_id
payload
created_at

```

---

# learners

## Purpose

Represents the canonical learner entity.

Every learner profile belongs to one learner.

## Relationships

```text
institution_id → institutions.id

```

Referenced By:

- learner_identities

## Columns

```text
id
institution_id
canonical_learner_id
status
created_at
updated_at

```

---

# learner_identities

## Purpose

Identity Resolution table.

Maps external system IDs to a canonical learner.

Example:

```text
Learner #100

Moodle User = 123

ERP User = 456

Payment User = ABC001

```

## Relationships

```text
learner_id → learners.id

data_source_id → data_sources.id

```

## Columns

```text
id
learner_id
data_source_id
external_id
external_type
created_at

```

