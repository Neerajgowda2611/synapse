package postgres

import (
	"context"
	"sort"
	"time"

	"github.com/profiler/backend/internal/connector"
)

func (c *Connector) DiscoverSchema(ctx context.Context) (*connector.SchemaSnapshot, error) {
	db, err := c.open()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	schemaName := c.config.Schema
	if schemaName == "" {
		schemaName = "public"
	}

	rows, err := db.QueryContext(ctx, `
		SELECT table_name, column_name, data_type
		FROM information_schema.columns
		WHERE table_schema = $1
		ORDER BY table_name, ordinal_position
	`, schemaName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tableColumns := make(map[string][]connector.Column)
	for rows.Next() {
		var tableName, columnName, dataType string
		if err := rows.Scan(&tableName, &columnName, &dataType); err != nil {
			return nil, err
		}
		tableColumns[tableName] = append(tableColumns[tableName], connector.Column{
			Name: columnName,
			Type: dataType,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	tableNames := make([]string, 0, len(tableColumns))
	for tableName := range tableColumns {
		tableNames = append(tableNames, tableName)
	}
	sort.Strings(tableNames)

	tables := make([]connector.Table, 0, len(tableNames))
	for _, tableName := range tableNames {
		tables = append(tables, connector.Table{
			Name:    tableName,
			Columns: tableColumns[tableName],
		})
	}

	return &connector.SchemaSnapshot{Tables: tables}, nil
}
