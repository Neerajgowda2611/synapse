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
	observations, err := c.observations.ListByDataSourceID(ctx, c.dataSourceID, 500, 0)
	if err != nil {
		return nil, err
	}
	if len(observations) == 0 {
		return nil, errors.New("no observations received yet; send at least one observation before discovering schema")
	}

	typeSamples := make(map[string][]map[string]any)
	for _, obs := range observations {
		var payload map[string]any
		if err := json.Unmarshal(obs.Payload, &payload); err != nil {
			continue
		}
		if len(typeSamples[obs.SourceEventType]) < 50 {
			typeSamples[obs.SourceEventType] = append(typeSamples[obs.SourceEventType], payload)
		}
	}

	eventTypes := make([]string, 0, len(typeSamples))
	for eventType := range typeSamples {
		eventTypes = append(eventTypes, eventType)
	}
	sort.Strings(eventTypes)

	tables := make([]connector.Table, 0, len(eventTypes))
	for _, eventType := range eventTypes {
		columns := inferColumns(typeSamples[eventType])
		tables = append(tables, connector.Table{
			Name:    eventType,
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
	return parts[0]
}

func (c *Connector) FetchRecords(ctx context.Context, entity string, options map[string]any) ([]map[string]any, error) {
	observations, err := c.observations.ListBySourceEventType(ctx, c.dataSourceID, entity, 500, 0)
	if err != nil {
		return nil, err
	}

	result := make([]map[string]any, 0, len(observations))
	for _, obs := range observations {
		var payload map[string]any
		if err := json.Unmarshal(obs.Payload, &payload); err != nil {
			continue
		}
		result = append(result, payload)
	}
	return result, nil
}
