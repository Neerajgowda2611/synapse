package database

import (
	"encoding/json"
	"testing"
)

func TestMetricCatalogSeedJSON(t *testing.T) {
	var claims []constructClaimSeed
	if err := json.Unmarshal(constructClaimsSeedJSON, &claims); err != nil {
		t.Fatalf("construct_claims.json: %v", err)
	}
	if len(claims) != 36 {
		t.Fatalf("construct_claims: got %d, want 36", len(claims))
	}
	seen := make(map[string]struct{}, len(claims))
	for _, c := range claims {
		if _, ok := seen[c.ClaimID]; ok {
			t.Fatalf("duplicate claim_id: %s", c.ClaimID)
		}
		seen[c.ClaimID] = struct{}{}
	}

	var register []constructRegisterSeed
	if err := json.Unmarshal(constructRegisterSeedJSON, &register); err != nil {
		t.Fatalf("construct_register.json: %v", err)
	}
	if len(register) != 8 {
		t.Fatalf("construct_register: got %d, want 8", len(register))
	}

	var norms []metricNormSeed
	if err := json.Unmarshal(metricNormsSeedJSON, &norms); err != nil {
		t.Fatalf("metric_norms.json: %v", err)
	}
	if len(norms) != 15 {
		t.Fatalf("metric_norms: got %d, want 15", len(norms))
	}

	var rewards []rewardSystemSeed
	if err := json.Unmarshal(rewardSystemsSeedJSON, &rewards); err != nil {
		t.Fatalf("reward_systems.json: %v", err)
	}
	if len(rewards) != 2 {
		t.Fatalf("reward_systems: got %d, want 2", len(rewards))
	}

	var jobs []jobSeed
	if err := json.Unmarshal(jobsSeedJSON, &jobs); err != nil {
		t.Fatalf("jobs.json: %v", err)
	}
	if len(jobs) != 2 {
		t.Fatalf("jobs: got %d, want 2", len(jobs))
	}
}
