package connector

import (
	"encoding/json"
	"errors"
	"fmt"
)

var ErrUnsupportedConnector = errors.New("unsupported connector")

type Factory func(config json.RawMessage) (Connector, error)

type Registry struct {
	factories map[string]Factory
}

func NewRegistry() *Registry {
	return &Registry{factories: make(map[string]Factory)}
}

func (r *Registry) Register(slug string, factory Factory) {
	r.factories[slug] = factory
}

func (r *Registry) New(connectorSlug string, config json.RawMessage) (Connector, error) {
	factory, ok := r.factories[connectorSlug]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedConnector, connectorSlug)
	}
	return factory(config)
}
