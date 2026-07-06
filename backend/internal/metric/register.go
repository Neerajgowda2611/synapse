package metric

import (
	"fmt"
	"sort"
	"strings"
)

func EvaluateGate(entry ConstructRegisterEntry, claims ClaimRegistry) GateReport {
	usableClaims := make(map[string]struct{})
	for _, claim := range claims.Claims {
		if claim.Trait != entry.Trait {
			continue
		}
		status := claim.Status()
		if status == ValidationStatusValidated || status == ValidationStatusSurfaced {
			usableClaims[claim.SignalType] = struct{}{}
		}
	}

	validatedSupport := make([]string, 0, len(entry.SupportingSignals))
	for _, signalType := range entry.SupportingSignals {
		if _, ok := usableClaims[signalType]; ok {
			validatedSupport = append(validatedSupport, signalType)
		}
	}
	sort.Strings(validatedSupport)

	checks := []GateCheck{
		{
			Name:   "definition",
			Passed: strings.TrimSpace(entry.Definition) != "",
			Detail: nonEmptyDetail(entry.Definition, "one-sentence definition present", "missing definition"),
		},
		{
			Name:   "scientific_rationale",
			Passed: strings.TrimSpace(entry.ScientificRationale) != "",
			Detail: nonEmptyDetail(entry.ScientificRationale, "construct-validity case present", "missing scientific rationale"),
		},
		{
			Name:   "legitimacy_rationale",
			Passed: strings.TrimSpace(entry.LegitimacyRationale) != "",
			Detail: nonEmptyDetail(entry.LegitimacyRationale, "why / for-whom case present", "missing legitimacy rationale"),
		},
		{
			Name:   "support",
			Passed: len(validatedSupport) >= MinSupportingCount,
			Detail: fmt.Sprintf("%d validated supporting signal(s) (%v); need >= %d", len(validatedSupport), validatedSupport, MinSupportingCount),
		},
		{
			Name:   "data_contract",
			Passed: len(entry.RequiredObservs) > 0 && len(entry.SourceApps) > 0,
			Detail: boolDetail(len(entry.RequiredObservs) > 0 && len(entry.SourceApps) > 0, "required observations + source apps declared", "missing required observations or source apps"),
		},
		{
			Name:   "fairness",
			Passed: entry.Fairness.DIFChecked && len(entry.Fairness.DIFFlags) == 0,
			Detail: fairnessDetail(entry.Fairness),
		},
		{
			Name:   "uncertainty",
			Passed: strings.TrimSpace(entry.UncertaintyPolicy) != "",
			Detail: nonEmptyDetail(entry.UncertaintyPolicy, "uncertainty policy present", "missing uncertainty policy"),
		},
	}

	return GateReport{
		ConstructID: entry.ConstructID,
		Checks:      checks,
	}
}

func (r *ConstructRegister) Surfaceable(claims ClaimRegistry) []string {
	if r == nil {
		return nil
	}
	ids := make([]string, 0, len(r.Entries))
	for id, entry := range r.Entries {
		if EvaluateGate(entry, claims).Surfaceable() {
			ids = append(ids, id)
		}
	}
	sort.Strings(ids)
	return ids
}

func nonEmptyDetail(value string, okDetail, failDetail string) string {
	if strings.TrimSpace(value) != "" {
		return okDetail
	}
	return failDetail
}

func boolDetail(ok bool, okDetail, failDetail string) string {
	if ok {
		return okDetail
	}
	return failDetail
}

func fairnessDetail(f FairnessStatus) string {
	if f.DIFChecked && len(f.DIFFlags) == 0 {
		return "DIF checked, no flags"
	}
	if len(f.DIFFlags) > 0 {
		return "DIF flags: " + strings.Join(f.DIFFlags, ", ")
	}
	return "DIF not yet checked"
}
