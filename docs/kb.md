# Learner Intelligence Platform

## Problem Statement

Educational institutions such as colleges, universities, academies, training centers, and ed-tech platforms often use multiple systems to manage learner information.

Examples include:

- ERP systems
- Moodle
- Canvas
- Google Classroom
- Internal databases
- Payment systems
- Assessment platforms
- Google Sheets
- Excel files

Each system contains only a portion of the learner's information.

For example:

- Attendance may exist in Moodle
- Marks may exist in an ERP
- Payments may exist in a finance system
- Assessments may exist in a separate platform
- Certificates may exist in another LMS

As a result, there is no single source that provides a complete learner profile.

The goal of this platform is to create a unified learner profile by collecting data from multiple institutional systems and consolidating it into a central platform.

## Core Vision

The platform acts as a centralized **Learner Intelligence Platform**.

It enables institutions to:

- Connect existing systems
- Import learner data
- Build unified learner profiles
- Generate analytics and insights
- Allow learners to view their consolidated profile

The platform serves two primary user groups.

### Institution Administrators

Administrators can:

- Connect institutional systems
- Configure data imports
- Monitor synchronization status
- View learner analytics
- Track attendance trends
- Track payment behavior
- Track assessment completion
- Track learner engagement

### Learners

Learners can:

- Log into the platform
- View their consolidated profile
- View attendance records
- View grades
- View assessments
- View payments
- View achievements
- View skills and certifications

## High-Level Architecture

```text
                  Source Systems
                          │
                          ▼
                      Connector
                          │
                          ▼
                  Schema Discovery
                          │
                          ▼
                 AI Data Analyst
                          │
                          ▼
                 Validation Layer
                          │
                          ▼
                    Raw Records
                          │
                          ▼
                 Identity Resolution
                          │
                          ▼
                 Learner Profiles
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
         Learner Portal        Admin Portal
```

## Platform Architecture Layers

The platform can be viewed in six logical layers.

### Layer 1 - Connector Platform

Responsible for connecting to external systems and extracting data.

### Layer 2 - Raw Data Storage

Stores imported records exactly as received from source systems.

### Layer 3 - Identity Resolution

Matches records belonging to the same learner across different systems.

### Layer 4 - Unified Learner Profile

Creates a single learner profile using all available data.

### Layer 5 - Analytics & Insights

Generates institutional analytics and learner metrics.

### Layer 6 - User Portals

Provides dashboards for learners and administrators.

## Source of Truth Strategy

The platform does not replace institutional systems.

Institutional systems remain the source of truth.

The platform acts as:

- An aggregation layer
- An intelligence layer
- A profile generation layer

Data can always be re-synchronized from connected systems whenever required.

## Canonical Learner Model

The platform maintains a standard learner model that acts as the target structure for all imported data.

Example:

```text
Learner
├── Learner ID
├── Name
├── Email
├── Phone
├── Attendance
├── Assessments
├── Payments
├── Certifications
├── Skills
└── Achievements
```

Regardless of the source system, all imported data is eventually mapped into this canonical structure.

## Connectors

Although the user experience may resemble n8n, the primary purpose of the connector engine is data ingestion rather than workflow automation.

Each connector acts as an adapter between an external system and the platform.

Examples:

- PostgreSQL
- MySQL
- Moodle
- ERPNext
- Canvas
- Google Sheets
- REST APIs
- CSV uploads
- Excel uploads

Every connector should provide:

- Authentication
- Connection testing
- Schema discovery
- Data fetching

Regardless of source type, all connectors should return data in a common format.

Example:

```json
{
  "records": [
    {
      "student_id": "123",
      "name": "Neeraj"
    }
  ]
}
```

This ensures downstream processing remains source agnostic.

## Schema Discovery

Once a connector is established, the platform automatically discovers:

- Tables
- Columns
- Relationships (when available)
- Sample records

This metadata becomes the foundation for both AI-assisted and manual mapping.

Example:

### `students`

Columns:

- `student_id`
- `full_name`
- `email`
- `mobile`

## Example Connector Flows

### Google Sheets Connector

Administrator provides:

- Google account
- Spreadsheet URL
- Worksheet name

The connector fetches rows and converts them into standard JSON records.

### PostgreSQL Connector

Administrator provides:

- Host
- Port
- Database
- Username
- Password

The connector queries institutional databases and converts results into standard JSON records.

### Moodle Connector

Administrator provides:

- Moodle URL
- API token

The connector retrieves learner information through Moodle APIs and converts results into standard JSON records.

## Why a Flow Builder is Needed

Every institution structures data differently.

Example:

- Institution A: `student_name`
- Institution B: `full_name`
- Institution C: `name`

Hardcoded mappings are not feasible.

A flow builder allows institutions to define how source data should be transformed into the platform's canonical learner model.

Example:

```text
PostgreSQL
     ↓
Field Mapper
     ↓
Learner Upsert
```

Source:

```json
{
  "stud_id": "123",
  "full_name": "Neeraj"
}
```

Mapped to:

```json
{
  "student_id": "123",
  "name": "Neeraj"
}
```

## AI Data Analyst Layer

Many institution administrators are not technical users.

They may not understand:

- Database schemas
- Tables
- Columns
- Relationships
- Field mappings

To simplify onboarding, the platform includes an AI Data Analyst layer.

The AI analyzes:

- Table names
- Column names
- Sample records

and suggests mappings to the canonical learner model.

Example:

- `std_id` → `learner_id`
- `std_nm` → `full_name`
- `std_eml` → `email`

The AI acts only as a recommendation engine.

It never directly controls production imports.

## Mapping Validation

Administrator approval alone is not sufficient because users may approve mappings without reviewing them.

Every AI-generated mapping passes through a validation layer.

Validation includes:

- Confidence scoring
- Sample data analysis
- Format validation
- Business rule validation
- Profile preview generation

Instead of validating technical mappings, administrators validate generated learner profiles.

Example preview:

- Name: Neeraj Gowda
- Email: neeraj@gmail.com
- Attendance: 87%
- Fee Status: Paid

This is easier for non-technical users to verify.

## Recommended MVP Flow Nodes

### Source Nodes

- PostgreSQL
- Google Sheets
- REST API

### Transform Nodes

- Mapper
- Filter
- Schema Normalizer
- AI Mapper
- Validator

### Destination Nodes

- Raw Records
- Learner Profiles

Example:

```text
Data Source
     ↓
Filter
     ↓
Mapper
     ↓
Learner Upsert
```

## Core Business Entities

Primary platform entities:

- Institutions
- Data Sources
- Connectors
- Sync Jobs
- Learners
- Learner Profiles

Workflows exist only to move and process data.

## Identity Resolution

One of the most important challenges is determining whether records from multiple systems belong to the same learner.

Example:

- Moodle: Student ID = `123`
- ERP: Student ID = `567`
- Payment Portal: Student ID = `ABC001`

All records may belong to the same learner.

Identity resolution is responsible for matching and merging records across systems into a unified learner profile.

## Raw Data Strategy

Imported records should never be discarded.

Flow:

```text
Source System
      ↓
 Raw Records
      ↓
Identity Resolution
      ↓
 Profile Builder
      ↓
Learner Profile
```

Benefits:

- Data lineage
- Reprocessing capability
- Profile rebuilding
- Auditability
- Debugging support

Raw data becomes the platform's internal source of truth.

## Data Ingestion Workflow Engine

The platform includes a lightweight workflow engine inspired by n8n.

Its purpose is to orchestrate data ingestion and profile generation.

Example workflow:

```text
PostgreSQL
      ↓
Schema Discovery
      ↓
AI Mapping
      ↓
Validation
      ↓
Raw Records
      ↓
Profile Builder
```

Each block represents a workflow node.

The workflow engine determines execution order and data movement between nodes.

## DAG-Based Execution

The workflow engine is implemented using a Directed Acyclic Graph (DAG).

Benefits:

- Sequential execution
- Parallel execution
- Dependency management
- Workflow visualization
- Future scalability

Example:

```text
      PostgreSQL
           ↓
        Student
           ↓
         Split
        /     \
Attendance   Payments
        \     /
         \   /
        Profile
```

Attendance and Payments can run simultaneously while the Profile node waits for both to complete.

## Database Architecture

The platform uses PostgreSQL as its primary database.

Reason:

The platform manages highly relational entities such as:

- Institutions
- Users
- Learners
- Connectors
- Mappings
- Sync Jobs

These entities are best represented using a relational database.

## Why PostgreSQL Instead of MongoDB

MongoDB works well for document-heavy systems.

However, this platform requires:

- Relationships
- Reporting
- Analytics
- Permissions
- Audit trails

These are areas where PostgreSQL performs exceptionally well.

## PostgreSQL + JSONB Strategy

The platform uses a hybrid approach.

### Relational Data

Stores:

- Institutions
- Users
- Learners
- Mappings
- Sync Jobs

### JSONB Data

Stores:

- Raw imported records
- Connector configurations
- Source schemas
- Profile metadata

This provides flexibility without sacrificing relational capabilities.

## Technology Stack

### Frontend

- Next.js

### Backend

- Go

### Database

- PostgreSQL

### Queue & Cache

- Redis

### Object Storage

- S3

### AI Layer

- OpenAI
- Gemini

### Workflow Engine

- Custom DAG engine

## MVP Scope

Phase 1 focuses on proving the core workflow.

Included:

- PostgreSQL connector
- Google Sheets connector
- Schema discovery
- Manual mapping
- AI mapping suggestions
- Raw record storage
- Learner profile generation

Future phases:

- Moodle connector
- ERPNext connector
- Advanced analytics
- Improved identity resolution
- Automated relationship discovery
- Additional connectors

## Success Criteria

The first successful version of the platform should allow an institution to:

- Connect a data source like Google Forms, Google Sheets, LearnX, Projex, or VTU placements
- Discover schema automatically
- Receive AI-assisted mapping suggestions
- Review generated learner profile previews
- Import data into the platform
- Generate unified learner profiles

Once this workflow is working end-to-end, additional capabilities can be introduced incrementally.