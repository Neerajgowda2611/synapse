package webhook

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/profiler/backend/internal/connector"
	"github.com/profiler/backend/internal/repository"
)

const slug = "webhook"

type Connector struct {
	config        connector.WebhookConfig
	dataSourceID  uuid.UUID
	observations  *repository.ObservationRepository
}

func New(
	config connector.WebhookConfig,
	dataSourceID uuid.UUID,
	observations *repository.ObservationRepository,
) connector.Connector {
	return &Connector{
		config:       config,
		dataSourceID: dataSourceID,
		observations: observations,
	}
}

func NewFromJSON(
	payload json.RawMessage,
	dataSourceID uuid.UUID,
	observations *repository.ObservationRepository,
) (connector.Connector, error) {
	var config connector.WebhookConfig
	if err := json.Unmarshal(payload, &config); err != nil {
		return nil, err
	}
	return New(config, dataSourceID, observations), nil
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
