package configs

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	AppEnv      string
	DatabaseURL string
}

func Load(configPath string) (*Config, error) {
	loadEnv(configPath)

	port := getEnv("PORT", "8080")
	if _, err := strconv.Atoi(port); err != nil {
		return nil, fmt.Errorf("invalid PORT: %w", err)
	}

	return &Config{
		Port:        port,
		AppEnv:      getEnv("APP_ENV", "development"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}, nil
}

func (c *Config) ServerAddress() string {
	return ":" + c.Port
}

func loadEnv(configPath string) {
	if configPath != "" {
		_ = godotenv.Load(configPath)
		return
	}

	for _, path := range []string{".env", "../.env", "../../.env"} {
		if err := godotenv.Load(path); err == nil {
			return
		}
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
