package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/profiler/backend/internal/connector"
)

const defaultFetchLimit = 500

func (c *Connector) FetchRecords(ctx context.Context, entity string, options map[string]any) ([]map[string]any, error) {
	if strings.TrimSpace(entity) == "" {
		return nil, fmt.Errorf("entity table name is required")
	}

	limit := intOption(options, "limit", defaultFetchLimit)
	offset := intOption(options, "offset", 0)
	if limit <= 0 {
		limit = defaultFetchLimit
	}
	if limit > 1000 {
		limit = 1000
	}
	if offset < 0 {
		offset = 0
	}

	schemaName := c.config.Schema
	if schemaName == "" {
		schemaName = "public"
	}

	db, err := c.open()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	query := fmt.Sprintf(
		`SELECT * FROM %s.%s LIMIT $1 OFFSET $2`,
		quoteIdent(schemaName),
		quoteIdent(entity),
	)

	rows, err := db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanRows(rows)
}

func scanRows(rows *sql.Rows) ([]map[string]any, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	result := make([]map[string]any, 0)
	for rows.Next() {
		values := make([]any, len(columns))
		scanTargets := make([]any, len(columns))
		for i := range values {
			scanTargets[i] = &values[i]
		}

		if err := rows.Scan(scanTargets...); err != nil {
			return nil, err
		}

		row := make(map[string]any, len(columns))
		for i, column := range columns {
			row[column] = normalizeValue(values[i])
		}
		result = append(result, row)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}

func normalizeValue(value any) any {
	switch v := value.(type) {
	case nil:
		return nil
	case []byte:
		return string(v)
	case time.Time:
		return v.UTC().Format(time.RFC3339Nano)
	default:
		return v
	}
}

func rowToJSON(row map[string]any) ([]byte, error) {
	return json.Marshal(row)
}

func externalIDFromRow(row map[string]any) *string {
	return connector.InferExternalID(row)
}

func quoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func intOption(options map[string]any, key string, defaultValue int) int {
	if options == nil {
		return defaultValue
	}
	value, ok := options[key]
	if !ok {
		return defaultValue
	}
	switch v := value.(type) {
	case int:
		return v
	case int64:
		return int(v)
	case float64:
		return int(v)
	default:
		return defaultValue
	}
}
