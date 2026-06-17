package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"time"

	"github.com/profiler/backend/internal/connector"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type Connector struct {
	config connector.PostgresConfig
}

func New(config connector.PostgresConfig) connector.Connector {
	return &Connector{config: config}
}

func (c *Connector) TestConnection(ctx context.Context) error {
	db, err := c.open()
	if err != nil {
		return err
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return db.PingContext(ctx)
}

func (c *Connector) open() (*sql.DB, error) {
	if c.config.Port == 0 {
		c.config.Port = 5432
	}
	if c.config.SSLMode == "" {
		c.config.SSLMode = "disable"
	}

	values := url.Values{}
	values.Set("sslmode", c.config.SSLMode)
	connURL := url.URL{
		Scheme:   "postgres",
		User:     url.UserPassword(c.config.Username, c.config.Password),
		Host:     fmt.Sprintf("%s:%d", c.config.Host, c.config.Port),
		Path:     c.config.Database,
		RawQuery: values.Encode(),
	}

	db, err := sql.Open("pgx", connURL.String())
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(2)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(time.Minute)

	return db, nil
}
