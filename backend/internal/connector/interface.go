package connector

import "context"

type Connector interface {
	TestConnection(ctx context.Context) error
	DiscoverSchema(ctx context.Context) (*SchemaSnapshot, error)
	FetchRecords(ctx context.Context, entity string, options map[string]any) ([]map[string]any, error)
}
