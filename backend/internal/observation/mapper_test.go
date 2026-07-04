package observation

import "testing"

func TestGetPathArrayIndex(t *testing.T) {
	payload := map[string]any{
		"skills": []any{
			map[string]any{"label": "Python", "value": "Python", "id": 42},
		},
	}
	value, ok := GetPath(payload, "skills.0.label")
	if !ok {
		t.Fatal("expected path to resolve")
	}
	if value != "Python" {
		t.Fatalf("got %v", value)
	}
}
