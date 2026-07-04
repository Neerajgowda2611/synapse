package observation

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"
)

func GetPath(payload map[string]any, path string) (any, bool) {
	path = strings.TrimSpace(path)
	if path == "" {
		return nil, false
	}
	path = strings.TrimPrefix(path, "payload.")
	current := any(payload)
	segments := strings.Split(path, ".")
	for _, segment := range segments {
		if arr, ok := current.([]any); ok {
			idx, err := strconv.Atoi(segment)
			if err != nil || idx < 0 || idx >= len(arr) {
				return nil, false
			}
			current = arr[idx]
			continue
		}
		obj, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		value, ok := obj[segment]
		if !ok {
			return nil, false
		}
		current = value
	}
	return current, true
}

func ApplyTransform(value any, mapping FieldMapping) (any, error) {
	transform := strings.TrimSpace(mapping.Transform)
	if transform == "" {
		transform = TransformRename
	}
	switch transform {
	case TransformRename:
		return value, nil
	case TransformConstant:
		if mapping.Params == nil {
			return nil, fmt.Errorf("constant transform missing params")
		}
		constant, ok := mapping.Params["value"]
		if !ok {
			return nil, fmt.Errorf("constant transform missing value")
		}
		return constant, nil
	case TransformHash:
		sum := sha256.Sum256([]byte(fmt.Sprint(value)))
		return hex.EncodeToString(sum[:]), nil
	case TransformCast:
		target := "string"
		if mapping.Params != nil {
			if castTo, ok := mapping.Params["to"]; ok {
				target = strings.ToLower(strings.TrimSpace(fmt.Sprint(castTo)))
			}
		}
		return castValue(value, target)
	case TransformParseDateTime:
		format := time.RFC3339
		if mapping.Params != nil {
			if provided, ok := mapping.Params["format"]; ok {
				format = strings.TrimSpace(fmt.Sprint(provided))
				if strings.EqualFold(format, "rfc3339") {
					format = time.RFC3339
				}
			}
		}
		ts, err := time.Parse(format, fmt.Sprint(value))
		if err != nil {
			return nil, err
		}
		return ts.UTC(), nil
	default:
		return nil, fmt.Errorf("unsupported transform %q", transform)
	}
}

func castValue(value any, to string) (any, error) {
	switch to {
	case "string", "str":
		return fmt.Sprint(value), nil
	case "int", "integer":
		i, err := strconv.Atoi(fmt.Sprint(value))
		if err != nil {
			return nil, err
		}
		return i, nil
	case "float", "float64", "number":
		f, err := strconv.ParseFloat(fmt.Sprint(value), 64)
		if err != nil {
			return nil, err
		}
		return f, nil
	case "bool", "boolean":
		b, err := strconv.ParseBool(strings.ToLower(strings.TrimSpace(fmt.Sprint(value))))
		if err != nil {
			return nil, err
		}
		return b, nil
	case "datetime":
		ts, err := time.Parse(time.RFC3339, fmt.Sprint(value))
		if err != nil {
			return nil, err
		}
		return ts.UTC(), nil
	default:
		return nil, fmt.Errorf("unsupported cast target %q", to)
	}
}
