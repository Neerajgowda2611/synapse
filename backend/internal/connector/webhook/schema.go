package webhook

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	"github.com/profiler/backend/internal/connector"
)

func (c *Connector) DiscoverSchema(ctx context.Context) (*connector.SchemaSnapshot, error) {
	records, err := c.records.ListByDataSourceID(ctx, c.dataSourceID, 500, 0)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, errors.New("no webhook payloads received yet; send data before discovering schema")
	}

	typeSamples := make(map[string][]map[string]any)
	for _, record := range records {
		var payload map[string]any
		if err := json.Unmarshal(record.Payload, &payload); err != nil {
			continue
		}
		entityType := record.EntityType
		if len(typeSamples[entityType]) < 50 {
			typeSamples[entityType] = append(typeSamples[entityType], payload)
		}
	}

	entityTypes := make([]string, 0, len(typeSamples))
	for entityType := range typeSamples {
		entityTypes = append(entityTypes, entityType)
	}
	sort.Strings(entityTypes)

	tables := make([]connector.Table, 0, len(entityTypes))
	for _, entityType := range entityTypes {
		columns := inferColumns(typeSamples[entityType])
		tables = append(tables, connector.Table{
			Name:    entityType,
			Columns: columns,
		})
	}

	return &connector.SchemaSnapshot{Tables: tables}, nil
}

func inferColumns(samples []map[string]any) []connector.Column {
	fieldTypes := make(map[string]map[string]struct{})
	for _, sample := range samples {
		for key, value := range sample {
			if fieldTypes[key] == nil {
				fieldTypes[key] = make(map[string]struct{})
			}
			fieldTypes[key][jsonTypeOf(value)] = struct{}{}
		}
	}

	keys := make([]string, 0, len(fieldTypes))
	for key := range fieldTypes {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	columns := make([]connector.Column, 0, len(keys))
	for _, key := range keys {
		columns = append(columns, connector.Column{
			Name: key,
			Type: mergeTypes(fieldTypes[key]),
		})
	}
	return columns
}

func jsonTypeOf(value any) string {
	switch value.(type) {
	case bool:
		return "boolean"
	case float64:
		return "number"
	case string:
		return "string"
	case nil:
		return "null"
	case []any:
		return "array"
	case map[string]any:
		return "object"
	default:
		return fmt.Sprintf("%T", value)
	}
}

func mergeTypes(types map[string]struct{}) string {
	if len(types) == 0 {
		return "unknown"
	}
	if len(types) == 1 {
		for t := range types {
			return t
		}
	}
	parts := make([]string, 0, len(types))
	for t := range types {
		parts = append(parts, t)
	}
	sort.Strings(parts)
	return parts[0] // simplified: primary type
}

func (c *Connector) FetchRecords(ctx context.Context, entity string, options map[string]any) ([]map[string]any, error) {
	records, err := c.records.ListByEntityType(ctx, c.dataSourceID, entity, 500, 0)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]any, 0, len(records))
	for _, record := range records {
		var payload map[string]any
		if err := json.Unmarshal(record.Payload, &payload); err != nil {
			continue
		}
		result = append(result, payload)
	}
	return result, nil
}
