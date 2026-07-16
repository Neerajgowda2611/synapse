package xint

import "strings"

// Config drives inbound/outbound xint integration behavior.
type Config struct {
	Enabled           bool
	ServiceToken      string
	AllowedSources    map[string]struct{}
	PlacementURL      string
	ProjexURL         string
	ShipxURL          string
	ProfileLinkSigner *ProfileLinkSigner
}

func ParseAllowedSources(raw string) map[string]struct{} {
	out := make(map[string]struct{})
	for _, part := range strings.Split(raw, ",") {
		source := strings.TrimSpace(strings.ToLower(part))
		if source == "" {
			continue
		}
		out[source] = struct{}{}
	}
	return out
}

func (c Config) IsAllowedSource(source string) bool {
	if len(c.AllowedSources) == 0 {
		return false
	}
	_, ok := c.AllowedSources[strings.ToLower(strings.TrimSpace(source))]
	return ok
}
