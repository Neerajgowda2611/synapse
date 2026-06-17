package connector

type Column struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type Table struct {
	Name    string   `json:"name"`
	Columns []Column `json:"columns"`
}

type SchemaSnapshot struct {
	Tables []Table `json:"tables"`
}

type PostgresConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Database string `json:"database"`
	Username string `json:"username"`
	Password string `json:"password"`
	SSLMode  string `json:"sslmode,omitempty"`
	Schema   string `json:"schema,omitempty"`
}
