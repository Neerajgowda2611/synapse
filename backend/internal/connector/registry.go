package connector

import (
	"errors"
	"fmt"
)

var ErrUnsupportedConnector = errors.New("unsupported connector")

type Factory func(config PostgresConfig) Connector

type Registry struct {
	factories map[string]Factory
}

func NewRegistry() *Registry {
	return &Registry{factories: make(map[string]Factory)}
}

func (r *Registry) Register(slug string, factory Factory) {
	r.factories[slug] = factory
}

func (r *Registry) New(connectorSlug string, config PostgresConfig) (Connector, error) {
	factory, ok := r.factories[connectorSlug]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrUnsupportedConnector, connectorSlug)
	}
	return factory(config), nil
}
