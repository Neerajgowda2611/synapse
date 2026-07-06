package metric

import (
	"context"
	"encoding/json"

	"github.com/profiler/backend/internal/repository"
)

func LoadClaimRegistry(ctx context.Context, repo *repository.ConstructClaimRegistryRepository) (ClaimRegistry, error) {
	rows, err := repo.ListAll(ctx)
	if err != nil {
		return ClaimRegistry{}, err
	}
	out := ClaimRegistry{Claims: make(map[string]ConstructClaim, len(rows))}
	for _, row := range rows {
		var claim ConstructClaim
		if err := json.Unmarshal(row.Spec, &claim); err != nil {
			return ClaimRegistry{}, err
		}
		if claim.Direction == "" {
			claim.Direction = "positive"
		}
		claim.SignalType = row.SignalType
		claim.Trait = row.Trait
		out.Claims[claim.ClaimID] = claim
	}
	return out, nil
}

func LoadConstructRegister(ctx context.Context, repo *repository.ConstructRegisterRepository) (ConstructRegister, error) {
	rows, err := repo.ListAll(ctx)
	if err != nil {
		return ConstructRegister{}, err
	}
	out := ConstructRegister{Entries: make(map[string]ConstructRegisterEntry, len(rows))}
	for _, row := range rows {
		var entry ConstructRegisterEntry
		if err := json.Unmarshal(row.Spec, &entry); err != nil {
			return ConstructRegister{}, err
		}
		entry.ConstructID = row.ConstructID
		entry.Trait = row.Trait
		entry.Family = row.Family
		if entry.Shape == "" {
			entry.Shape = string(MetricShapeMonotonic)
		}
		out.Entries[entry.ConstructID] = entry
	}
	return out, nil
}

func LoadNorms(ctx context.Context, repo *repository.MetricNormRepository) (map[string]NormSpec, error) {
	rows, err := repo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]NormSpec, len(rows))
	for _, row := range rows {
		var norm NormSpec
		if err := json.Unmarshal(row.Spec, &norm); err != nil {
			return nil, err
		}
		if norm.Kind == "" {
			norm.Kind = "identity"
		}
		out[row.SignalType] = norm
	}
	return out, nil
}

func LoadRewardSystems(ctx context.Context, repo *repository.RewardSystemRepository) (map[string]RewardSystem, error) {
	rows, err := repo.ListAll(ctx)
	if err != nil {
		return nil, err
	}
	out := make(map[string]RewardSystem, len(rows))
	for _, row := range rows {
		var rewardSystem RewardSystem
		if err := json.Unmarshal(row.Spec, &rewardSystem); err != nil {
			return nil, err
		}
		rewardSystem.ID = row.ID
		out[rewardSystem.ID] = rewardSystem
	}
	return out, nil
}

