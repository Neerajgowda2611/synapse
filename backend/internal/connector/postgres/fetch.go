package postgres

import (
	"context"
	"errors"
)

func (c *Connector) FetchRecords(ctx context.Context, entity string, options map[string]any) ([]map[string]any, error) {
	return nil, errors.New("fetch records is not implemented in this phase")
}
