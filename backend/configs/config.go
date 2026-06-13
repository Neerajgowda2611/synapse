package configs

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                  string
	AppEnv                string
	DatabaseURL           string
	ZitadelIssuer         string
	ZitadelAudience       string
	ZitadelJWKSURL        string
	ZitadelWebClientID    string
	ZitadelServiceToken   string
	ZitadelLoginClientID  string
	ZitadelRedirectURI    string
	FrontendURL           string
	CORSAllowOrigins      string
}

func Load(configPath string) (*Config, error) {
	loadEnv(configPath)

	port := getEnv("PORT", "8080")
	if _, err := strconv.Atoi(port); err != nil {
		return nil, fmt.Errorf("invalid PORT: %w", err)
	}

	issuer := os.Getenv("ZITADEL_ISSUER")
	if issuer == "" {
		return nil, fmt.Errorf("ZITADEL_ISSUER is required")
	}

	audience := os.Getenv("ZITADEL_API_AUDIENCE")
	if audience == "" {
		return nil, fmt.Errorf("ZITADEL_API_AUDIENCE is required")
	}

	jwksURL := getEnv("ZITADEL_JWKS_URL", issuer+"/oauth/v2/keys")
	frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")
	webClientID := os.Getenv("ZITADEL_WEB_CLIENT_ID")
	if webClientID == "" {
		return nil, fmt.Errorf("ZITADEL_WEB_CLIENT_ID is required")
	}

	return &Config{
		Port:                 port,
		AppEnv:               getEnv("APP_ENV", "development"),
		DatabaseURL:          os.Getenv("DATABASE_URL"),
		ZitadelIssuer:        issuer,
		ZitadelAudience:      audience,
		ZitadelJWKSURL:       jwksURL,
		ZitadelWebClientID:   webClientID,
		ZitadelServiceToken:  os.Getenv("ZITADEL_SERVICE_USER_TOKEN"),
		ZitadelLoginClientID: os.Getenv("ZITADEL_LOGIN_CLIENT_ID"),
		ZitadelRedirectURI:   getEnv("ZITADEL_REDIRECT_URI", frontendURL+"/auth/callback"),
		FrontendURL:          frontendURL,
		CORSAllowOrigins:     getEnv("CORS_ALLOW_ORIGINS", frontendURL),
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
