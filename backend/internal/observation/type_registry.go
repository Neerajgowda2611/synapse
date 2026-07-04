package observation

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

const QuarantineReasonRegistryValidation = "registry_validation"

type FieldType struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Required bool   `json:"required"`
}

type TypeSchema struct {
	ObservationType string      `json:"observation_type"`
	Version         string      `json:"version"`
	Fields          []FieldType `json:"fields"`
}

func ParseFieldTypes(raw json.RawMessage) ([]FieldType, error) {
	var fields []FieldType
	if err := json.Unmarshal(raw, &fields); err != nil {
		return nil, err
	}
	return fields, nil
}

func ParseTypeSchema(raw json.RawMessage) (*TypeSchema, error) {
	var schema TypeSchema
	if err := json.Unmarshal(raw, &schema); err != nil {
		return nil, err
	}
	return &schema, nil
}

func ValidateFields(schema *TypeSchema, fields map[string]any) string {
	if schema == nil {
		return "unknown observation_type"
	}
	for _, ft := range schema.Fields {
		value, ok := fields[ft.Name]
		if !ok || value == nil {
			if ft.Required {
				return fmt.Sprintf("missing required canonical field '%s'", ft.Name)
			}
			continue
		}
		if reason := validateFieldType(ft.Name, ft.Type, value); reason != "" {
			return reason
		}
	}
	return ""
}

func validateFieldType(name, expected string, value any) string {
	switch expected {
	case "str":
		if _, ok := value.(string); !ok {
			return fmt.Sprintf("field '%s' expected str, got %T", name, value)
		}
	case "datetime":
		switch value.(type) {
		case time.Time, *time.Time:
			return ""
		default:
			return fmt.Sprintf("field '%s' expected datetime, got %T", name, value)
		}
	case "float":
		switch value.(type) {
		case float64, float32, int, int64:
			return ""
		default:
			return fmt.Sprintf("field '%s' expected float, got %T", name, value)
		}
	case "int":
		switch value.(type) {
		case int, int64, float64:
			return ""
		default:
			return fmt.Sprintf("field '%s' expected int, got %T", name, value)
		}
	case "bool":
		if _, ok := value.(bool); !ok {
			return fmt.Sprintf("field '%s' expected bool, got %T", name, value)
		}
	default:
		if strings.TrimSpace(expected) == "" {
			return ""
		}
		return fmt.Sprintf("field '%s' has unknown schema type '%s'", name, expected)
	}
	return ""
}
