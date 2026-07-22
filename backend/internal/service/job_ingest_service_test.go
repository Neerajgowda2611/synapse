package service

import (
	"errors"
	"testing"

	"github.com/profiler/backend/internal/model"
)

func TestInferTargetKind(t *testing.T) {
	tests := []struct {
		name      string
		source    string
		ref       string
		want      model.JobTargetKind
		wantError bool
	}{
		{name: "placement job", source: "placement", ref: "placement:job:42", want: model.JobTargetKindJob},
		{name: "career profile", source: "placement", ref: "placement:career_profile:42", want: model.JobTargetKindCareerProfile},
		{name: "projex project", source: "projex", ref: "projex:project:abc", want: model.JobTargetKindProject},
		{name: "source mismatch", source: "projex", ref: "placement:job:42", wantError: true},
		{name: "unknown kind", source: "projex", ref: "projex:milestone:abc", wantError: true},
		{name: "missing id", source: "projex", ref: "projex:project:", wantError: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := inferTargetKind(tt.source, tt.ref)
			if tt.wantError {
				if !errors.Is(err, ErrInvalidIngestPayload) {
					t.Fatalf("got error %v, want ErrInvalidIngestPayload", err)
				}
				return
			}
			if err != nil {
				t.Fatalf("inferTargetKind returned error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}
