import type { JobFitResponse } from "@/lib/api/profiler"
import { formatTraitName } from "@/lib/profiling/mappers"
import type { JobFitBreakdown, JobFitTraitBreakdown } from "@/lib/profiling/job-fit-types"

function weightLabel(weight: number, maxWeight: number): "High" | "Medium" | "Low" {
  if (maxWeight <= 0) return "Low"
  const ratio = weight / maxWeight
  if (ratio >= 0.85) return "High"
  if (ratio >= 0.55) return "Medium"
  return "Low"
}

function buildSummary(traits: JobFitTraitBreakdown[]): string {
  const top = traits
    .filter((t) => !t.missing)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((t) => t.name)

  if (top.length === 0) {
    return "This role has trait criteria, but we need more profile signals to score your fit."
  }
  if (top.length === 1) {
    return `This role weighs ${top[0]} most heavily in your match score.`
  }
  return `This role weighs ${top[0]} and ${top[1]} most heavily in your match score.`
}

export function mapJobFitBreakdown(fit: JobFitResponse): JobFitBreakdown {
  const maxWeight = Math.max(...fit.traits.map((t) => t.weight), 0)

  const traits: JobFitTraitBreakdown[] = fit.traits
    .map((reading) => {
      const roleWeightPct =
        fit.weight_sum > 0
          ? Math.round((reading.weight / fit.weight_sum) * 1000) / 10
          : 0
      const matchPoints =
        fit.weight_sum > 0
          ? Math.round((reading.contribution / fit.weight_sum) * 1000) / 10
          : 0

      return {
        trait: reading.trait,
        name: formatTraitName(reading.trait),
        weight: reading.weight,
        weight_label: weightLabel(reading.weight, maxWeight),
        role_weight_pct: roleWeightPct,
        your_score: Math.round(reading.trait_value * 100),
        contribution: reading.contribution,
        match_points: matchPoints,
        missing: reading.missing,
        usable: reading.usable,
      }
    })
    .sort((a, b) => b.match_points - a.match_points)

  return {
    fit_percent: Math.round(fit.fit_percent),
    raw_score: fit.raw_score,
    weight_sum: fit.weight_sum,
    summary: buildSummary(traits),
    missing_traits: fit.missing_traits.map(formatTraitName),
    traits,
  }
}
