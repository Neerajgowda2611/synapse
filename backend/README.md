# Profiler Backend

Go backend service built with Gin, GORM, and PostgreSQL.

## Tech Stack

- **Go** — application language
- **Gin** — HTTP web framework
- **GORM** — ORM for database access
- **PostgreSQL** — primary database

## Project Structure

```
backend/
├── cmd/server/          # Application entrypoint
├── internal/
│   ├── app/             # Application bootstrap and wiring
│   ├── handler/         # HTTP handlers (Gin routes)
│   ├── service/         # Business logic
│   ├── repository/      # Data access layer (GORM)
│   ├── model/           # Domain and database models
│   ├── connector/       # External system integrations
│   ├── workflow/        # Multi-step business workflows
│   ├── ai/              # AI/LLM integrations
│   ├── middleware/      # HTTP middleware
│   ├── logs/            # Logging setup and utilities
│   ├── vars/            # Shared constants and configuration keys
│   └── utils/           # Generic helper functions
├── configs/             # Configuration files
├── migrations/          # SQL database migrations
├── pkg/                 # Public, reusable packages
├── go.mod
└── .env.example
```

## Observation & signal catalogs

Runtime seed JSON lives in `pkg/database/catalog/`. **Design source of truth** is the sibling `profiling-design` repo:

- `observation_layer/catalog.py` — types + bindings
- `signal_layer/seed.py` — signals + derivation rules

After catalog changes in profiling-design, export JSON with `profiling-design/scripts/sync_profiler_catalog_json.py`, then restart the backend.

Coverage checklist: `profiling-design/docs/event_coverage_registry.md`.

## Getting Started

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your local PostgreSQL credentials.

3. Install dependencies:

   ```bash
   go mod download
   ```

4. Run the server (once implemented):

   ```bash
   go run ./cmd/server
   ```

## Folder Responsibilities

See the [Project Structure](#project-structure) section above. Each directory is documented in the repository root README or inline comments when implementation begins.
