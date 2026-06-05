# Implementation Roadmap

## Objective

The goal of the MVP is to prove the complete learner data journey.

```text
Source System
↓
Schema Discovery
↓
Data Mapping
↓
Data Import
↓
Learner Creation
↓
Profile Generation
```

The initial focus is not on AI, analytics, or advanced workflows.

The focus is on successfully importing learner data from external systems and generating unified learner profiles.

## Phase 0 - Foundation & Design

### Goal

Define the core concepts of the platform before development begins.

### Tasks

- Define canonical learner model
- Define profile structure
- Define MVP scope
- Finalize database design
- Finalize connector architecture
- Finalize mapping architecture

### Deliverables

- Architecture document
- ER diagram
- Database schema
- Canonical learner model

### Success Criteria

The team has a clear understanding of:

- What a learner profile is
- How data flows through the system
- How connectors work
- How mapping works

## Phase 1 - Platform Foundation

### Goal

Build the core platform infrastructure.

### Tasks

- Setup backend project
- Setup frontend project
- Setup PostgreSQL
- Setup authentication
- Create institution management APIs
- Create user management APIs

### Deliverables

- Institution management
- User management
- Authentication

### Success Criteria

An institution can be created and managed within the platform.

## Phase 2 - Connector Framework

### Goal

Build the foundation for connecting external systems.

### Tasks

- Create connector framework
- Create connector registry
- Implement PostgreSQL connector
- Implement Google Sheets connector
- Implement REST API connector
- Build connection testing APIs

### Deliverables

- Connector framework
- First three connectors

### Success Criteria

An administrator can connect an external data source successfully.

## Phase 3 - Schema Discovery

### Goal

Automatically discover source system structures.

### Tasks

- Discover tables
- Discover columns
- Store schema snapshots
- Build schema discovery APIs
- Build schema viewer UI

### Deliverables

- Schema discovery service
- Schema browser

### Success Criteria

An administrator can view discovered tables and columns from a connected source.

## Phase 4 - Manual Mapping Engine

### Goal

Allow administrators to map source fields to the platform's canonical learner model.

### Tasks

- Create mapping configuration APIs
- Create mapping storage
- Build mapping UI
- Build mapping validation

### Example

- `student_name` → `name`
- `email_address` → `email`
- `mobile_no` → `phone`

### Deliverables

- Mapping engine
- Mapping UI

### Success Criteria

An administrator can create and save mappings between source fields and learner profile fields.

## Phase 5 - Data Import & Raw Storage

### Goal

Import source data and store it safely.

### Tasks

- Build sync job service
- Fetch records from source systems
- Apply mapping rules
- Store raw records
- Track import status

### Deliverables

- Sync engine
- Raw record storage

### Success Criteria

Imported learner data is stored successfully in the platform.

## Phase 6 - Learner Profile Generation

### Goal

Generate unified learner profiles.

### Tasks

- Create learner records
- Build profile aggregation logic
- Generate learner profiles
- Build profile APIs

### Deliverables

- Learner service
- Profile builder

### Success Criteria

Imported records are converted into learner profiles.

## Phase 7 - Learner Portal

### Goal

Allow learners to view their consolidated profile.

### Tasks

- Build learner dashboard
- Display profile information
- Display attendance
- Display assessments
- Display payments
- Display skills and certifications

### Deliverables

- Learner portal

### Success Criteria

A learner can log in and view their generated profile.

## Phase 8 - AI Data Analyst

### Goal

Assist administrators with schema understanding and mapping.

### Tasks

- Analyze schema metadata
- Analyze sample records
- Generate mapping suggestions
- Generate confidence scores
- Create mapping recommendation UI

### Example

- `std_nm` → `full_name`
- Confidence: 96%

### Deliverables

- AI mapping suggestions
- Confidence engine

### Success Criteria

Administrators receive AI-generated mapping recommendations.

## Phase 9 - Validation & Profile Preview

### Goal

Reduce incorrect imports.

### Tasks

- Validate AI suggestions
- Validate sample data
- Generate profile preview
- Build approval workflow

### Deliverables

- Validation engine
- Profile preview

### Success Criteria

Administrators can validate learner profiles before importing data.

## Phase 10 - Workflow Engine

### Goal

Introduce visual workflow-based ingestion.

### Tasks

- Create workflow designer
- Create node framework
- Create workflow execution engine
- Implement DAG execution
- Build workflow monitoring

### Example Workflow

```text
PostgreSQL
↓
Schema Discovery
↓
AI Mapper
↓
Validation
↓
Profile Builder
```

### Deliverables

- Workflow builder
- DAG engine

### Success Criteria

Administrators can create visual ingestion workflows.

## Phase 11 - Identity Resolution

### Goal

Merge learner records coming from multiple systems.

### Tasks

- Create identity matching rules
- Match records across systems
- Link external IDs
- Resolve duplicate learners

### Example

```text
Moodle User: 123
ERP User: 567
Payment User: ABC001
↓
Learner: Neeraj Gowda
```

### Deliverables

- Identity resolution service

### Success Criteria

The platform can recognize the same learner across multiple systems.

## Phase 12 - Analytics & Insights

### Goal

Generate institutional intelligence and reporting.

### Tasks

- Attendance analytics
- Assessment analytics
- Payment analytics
- Profile completeness metrics
- Learner engagement metrics

### Deliverables

- Admin dashboard
- Analytics engine

### Success Criteria

Administrators can gain actionable insights from learner data.

## Recommended Milestones

### Milestone 1

**Connect PostgreSQL and Discover Schema**

Success:
Administrator can connect a database and view tables and columns.

### Milestone 2

**Map and Import Learner Data**

Success:
Administrator can map fields and import learner records.

### Milestone 3

**Generate Learner Profiles**

Success:
Learner profiles are generated from imported data.

### Milestone 4

**AI-Assisted Mapping**

Success:
AI provides schema understanding and mapping recommendations.

### Milestone 5

**Visual Workflow Builder**

Success:
Administrators can create ingestion workflows visually.

### Milestone 6

**Identity Resolution & Analytics**

Success:
The platform can unify learner data from multiple systems and generate insights.

## MVP Definition

The MVP is considered complete when an institution can:

- Connect a PostgreSQL database
- Discover schema automatically
- Map source fields to the canonical learner model
- Import learner data
- Generate learner profiles
- Allow learners to view their profiles

Everything beyond this point can be introduced incrementally.