package postgres

import (
	"encoding/json"

	"github.com/profiler/backend/internal/connector"
)

func NewFromJSON(payload json.RawMessage) (connector.Connector, error) {
	var config connector.PostgresConfig
	if err := json.Unmarshal(payload, &config); err != nil {
		return nil, err
	}
	return New(config), nil
}
