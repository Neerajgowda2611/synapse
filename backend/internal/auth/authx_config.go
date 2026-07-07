package auth

// AuthxConfig holds settings for parsing AuthX-issued OIDC tokens and minting
// the internal profiler access token.
type AuthxConfig struct {
	Enabled      bool
	AuthIdpUrl   string
	ClientID     string
	ClientSecret string
}
