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
├── Identity Resolution
├── Profile Metadata
├── Identity
├── Education
├── Attendance
├── Assessments
├── Payments
├── Skills
├── Certifications
├── Projects
└── Placements
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

- learner_profiles
- learner_identity
- learner_education
- learner_attendance_records
- learner_assessments
- learner_payments
- learner_skills
- learner_certifications
- learner_projects
- learner_placements
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

---

# learner_profiles

## Purpose

Stores profile-level metadata and acts as the aggregation layer for the learner profile.

Examples:

- Profile Completion Percentage
- Profile Score
- Profile Status
- Last Profile Generation Time

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

profile_status

profile_score

profile_completion_percentage

last_generated_at

created_at
updated_at

```

---

# learner_identity

## Purpose

Stores CPS Identity Domain.

Contains personal and demographic information about the learner.

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

full_name
first_name
last_name

email
phone

gender
date_of_birth

nationality

profile_photo_url

created_at
updated_at

```

---

# learner_education

## Purpose

Stores CPS Education Domain.

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

program
degree
specialization

department

batch

current_year

roll_number

admission_date

graduation_date

cgpa

academic_status

created_at
updated_at

```

---

# learner_attendance_records

## Purpose

Stores attendance history.

Attendance changes over time and should not overwrite previous records.

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

attendance_percentage

classes_attended

classes_conducted

attendance_date

created_at

```

---

# learner_assessments

## Purpose

Stores learner assessments.

One learner can have many assessments.

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

assessment_name
assessment_type

score
max_score
percentage

attempt_date

status

created_at
updated_at

```

---

# learner_payments

## Purpose

Stores learner payment history.

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

payment_type

amount
currency

status

due_date

payment_date

created_at
updated_at

```

---

# learner_skills

## Purpose

Stores learner skills.

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

skill_name
category
proficiency

created_at
updated_at

```

---

# learner_certifications

## Purpose

Stores learner certifications.

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

certificate_name
issuer

issued_date
expiry_date

certificate_url

created_at
updated_at

```

---

# learner_projects

## Purpose

Stores learner projects.

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

project_name
description

role

tech_stack

start_date
end_date

created_at
updated_at

```

---

# learner_placements

## Purpose

Stores placement outcomes.

## Relationships

```text
learner_id → learners.id

```

## Columns

```text
id
learner_id

placement_status

company_name

job_role

package

joining_date

created_at
updated_at

```

