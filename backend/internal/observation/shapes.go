package observation

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
)

func ComputeShapeSignature(payload json.RawMessage) (*string, error) {
	var decoded any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return nil, err
	}
	parts := make([]string, 0, 32)
	walkShape("", decoded, &parts)
	sort.Strings(parts)
	sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
	signature := "sha256:" + hex.EncodeToString(sum[:])
	return &signature, nil
}

func walkShape(prefix string, value any, out *[]string) {
	switch typed := value.(type) {
	case map[string]any:
		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		for _, key := range keys {
			path := key
			if prefix != "" {
				path = prefix + "." + key
			}
			walkShape(path, typed[key], out)
		}
	case []any:
		elementType := "empty"
		if len(typed) > 0 {
			elementType = typeName(typed[0])
		}
		*out = append(*out, prefix+"[]:"+elementType)
	default:
		*out = append(*out, prefix+":"+typeName(typed))
	}
}

func typeName(value any) string {
	switch value.(type) {
	case nil:
		return "null"
	case string:
		return "string"
	case bool:
		return "bool"
	case float64, float32:
		return "number"
	case int, int64, int32, int16, int8:
		return "int"
	case map[string]any:
		return "object"
	case []any:
		return "array"
	default:
		return "unknown"
	}
}
