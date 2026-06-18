package webhook

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/connector"
	"github.com/profiler/backend/internal/repository"
)

const slug = "webhook"

type Connector struct {
	config       connector.WebhookConfig
	dataSourceID uuid.UUID
	records      *repository.RawRecordRepository
}

func New(
	config connector.WebhookConfig,
	dataSourceID uuid.UUID,
	records *repository.RawRecordRepository,
) connector.Connector {
	return &Connector{
		config:       config,
		dataSourceID: dataSourceID,
		records:      records,
	}
}

func NewFromJSON(
	payload json.RawMessage,
	dataSourceID uuid.UUID,
	records *repository.RawRecordRepository,
) (connector.Connector, error) {
	var config connector.WebhookConfig
	if err := json.Unmarshal(payload, &config); err != nil {
		return nil, err
	}
	return New(config, dataSourceID, records), nil
}

func (c *Connector) TestConnection(ctx context.Context) error {
	if c.config.IngestToken == "" {
		return errors.New("webhook ingest token is not configured")
	}
	return nil
}

func GenerateIngestToken() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "wh_" + base64.RawURLEncoding.EncodeToString(buf), nil
}

func IsWebhookSlug(s string) bool {
	return s == slug
}

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
