package connector

import "fmt"

func InferExternalID(payload map[string]any) *string {
	keys := []string{"id", "external_id", "student_id", "learner_id", "uuid"}
	for _, key := range keys {
		if v, ok := payload[key]; ok {
			s := fmt.Sprint(v)
			if s != "" && s != "<nil>" {
				return &s
			}
		}
	}
	return nil
}
