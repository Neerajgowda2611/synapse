# Connector Platform - Phase 4 Implementation Plan

## Goal

Build the foundation of the Connector Platform.

At the end of this phase, an institution administrator should be able to:

1. Create a Data Source
2. Store Connection Credentials
3. Test Connection
4. Discover Source Schema
5. View Tables/Entities
6. Select Which Entities to Import

We are NOT building:

* Workflow Builder
* DAG Engine
* AI Mapping
* Learner Profile Generation
* Analytics

Those will come later.

---

# Success Criteria

The phase is considered complete when:

```text
Institution Admin
        ↓
Create PostgreSQL Source
        ↓
Test Connection
        ↓
Discover Tables
        ↓
Store Schema
        ↓
View Tables in UI
        ↓
Select Entities
```

works successfully.

---

# Architecture

```text
Frontend
    ↓

Backend API
    ↓

Connector Registry
    ↓

Connector Interface
    ↓

PostgreSQL Connector
    ↓

External PostgreSQL Database
```

---

# Step 1 - Connector Interface

Create:

```text
internal/connector/
```

Structure:

```text
internal/

  connector/

      interface.go

      registry.go

      postgres/
```

---

## Connector Interface

Every connector must implement:

```go
type Connector interface {
    TestConnection(ctx context.Context) error

    DiscoverSchema(
        ctx context.Context,
    ) (*SchemaSnapshot, error)

    FetchRecords(
        ctx context.Context,
        entity string,
        options map[string]interface{},
    ) ([]map[string]interface{}, error)
}
```

Purpose:

Provide a common interface for all future connectors.

Examples:

* PostgreSQL
* MySQL
* Google Sheets
* Moodle
* ERPNext
* REST APIs

---

# Step 2 - Connector Registry

Create:

```go
type Registry struct {}
```

Purpose:

Resolve connector implementation based on connector type.

Example:

```text
postgres
    ↓
PostgresConnector

moodle
    ↓
MoodleConnector
```

Usage:

```go
connector := registry.Get("postgres")
```

---

# Step 3 - PostgreSQL Connector

Folder:

```text
internal/connector/postgres/
```

Create:

```text
connector.go
schema.go
fetch.go
```

---

## Test Connection

Input:

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "college",
  "username": "admin",
  "password": "secret"
}
```

Implementation:

```go
db.PingContext(ctx)
```

Output:

```json
{
  "success": true
}
```

---

# Step 4 - Data Source CRUD

Purpose:

Allow institutions to register external systems.

---

## Create Data Source

Endpoint:

```http
POST /api/v1/data-sources
```

Request:

```json
{
  "name": "ABC College PostgreSQL",
  "connector_type": "postgres"
}
```

Tables:

```text
data_sources
connector_credentials
```

---

## List Data Sources

Endpoint:

```http
GET /api/v1/data-sources
```

---

## Get Data Source

Endpoint:

```http
GET /api/v1/data-sources/:id
```

---

# Step 5 - Credentials Management

Store credentials in:

```text
connector_credentials
```

Example:

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "college"
}
```

Stored as:

```json
encrypted_payload
```

Important:

Passwords must never be returned through APIs.

---

# Step 6 - Test Connection API

Endpoint:

```http
POST /api/v1/data-sources/:id/test
```

Flow:

```text
Load Credentials
        ↓
Create Connector
        ↓
TestConnection()
        ↓
Return Result
```

Response:

```json
{
  "success": true
}
```

or

```json
{
  "success": false,
  "error": "authentication failed"
}
```

---

# Step 7 - Schema Discovery

Purpose:

Understand the structure of the source system.

---

## PostgreSQL Discovery

Tables:

```sql
information_schema.tables
```

Columns:

```sql
information_schema.columns
```

---

Example Result

```json
{
  "students": [
    {
      "name": "student_id",
      "type": "varchar"
    },
    {
      "name": "student_name",
      "type": "varchar"
    }
  ]
}
```

---

# Step 8 - Store Schema Snapshot

Persist discovered schema into:

```text
schema_snapshots
```

Benefits:

* Versioning
* Historical Tracking
* Re-discovery
* AI Mapping Later

---

# Step 9 - Build Source Entities

Purpose:

Allow admins to identify which source objects represent which learner domains.

Examples:

```text
students
    ↓
identity

attendance
    ↓
attendance

payments
    ↓
payments

assessments
    ↓
assessments
```

Store in:

```text
data_source_entities
```

---

# Step 10 - Schema Explorer API

Endpoint:

```http
GET /api/v1/data-sources/:id/schema
```

Response:

```json
{
  "tables": [
    {
      "name": "students",
      "columns": [
        {
          "name": "student_name",
          "type": "varchar"
        }
      ]
    }
  ]
}
```

---

# Step 11 - Schema Explorer UI

Display:

```text
ABC College PostgreSQL

Tables

▶ students

▶ attendance

▶ payments

▶ assessments
```

Expand:

```text
students

student_id
student_name
student_email
student_phone
```

---

# Step 12 - Entity Selection UI

Allow:

```text
students
    → identity

attendance
    → attendance

payments
    → payments

assessments
    → assessments
```

Save selection into:

```text
data_source_entities
```

---

# Deliverables

Backend:

* Connector Interface
* Connector Registry
* PostgreSQL Connector
* Data Source CRUD
* Credential Storage
* Test Connection API
* Schema Discovery Service
* Schema Explorer API

Frontend:

* Data Source List
* Create Data Source Form
* Test Connection Button
* Schema Explorer
* Entity Selection Screen

Database Tables Used:

```text
connector_definitions

data_sources

connector_credentials

schema_snapshots

data_source_entities
```

---

# Out of Scope

The following are NOT part of this phase:

```text
AI Mapping

Workflow Builder

DAG Engine

Learner Profile Builder

Analytics

Notifications

Google Sheets Connector

Moodle Connector

ERP Connector
```

These will be implemented after the connector foundation is stable.

---

# Completion Definition

Phase 4 is complete when:

```text
Connect PostgreSQL
        ↓
Test Connection
        ↓
Discover Schema
        ↓
Store Schema
        ↓
View Schema
        ↓
Assign Entities
```

works successfully end-to-end.
