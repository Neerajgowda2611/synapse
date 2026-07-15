"use client"

import { cn } from "@/lib/utils"
import { chartColorVar } from "@/lib/themes/chart-colors"
import type { JobFitBreakdown, JobFitTraitBreakdown } from "@/lib/profiling/job-fit-types"

type JobFitBreakdownPanelProps = {
  breakdown: JobFitBreakdown
  className?: string
}

function TraitBreakdownRow({
  trait,
  colorIndex,
}: {
  trait: JobFitTraitBreakdown
  colorIndex: number
}) {
  const levelBarWidth = trait.missing ? 0 : Math.min(100, Math.max(4, trait.your_score))
  const barColor = chartColorVar(colorIndex)

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{trait.name}</p>
          <p className="text-xs text-muted-foreground">
            Role weight: {trait.role_weight_pct}%
            {!trait.missing && (
              <>
                {" "}
                &bull; Your level: {trait.your_score}%
              </>
            )}
          </p>
        </div>
        <div className="text-right">
          {trait.missing ? (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Not enough evidence
            </p>
          ) : (
            <p className="text-sm font-semibold text-foreground">
              +{trait.match_points} match pts
            </p>
          )}
        </div>
      </div>

      {!trait.missing ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
            <span>Your level</span>
            <span>{trait.your_score}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${levelBarWidth}%`, backgroundColor: barColor }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function JobFitBreakdownPanel({ breakdown, className }: JobFitBreakdownPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          How your {breakdown.fit_percent}% match breaks down
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{breakdown.summary}</p>
      </div>

      <div className="space-y-3">
        {breakdown.traits.map((trait, index) => (
          <TraitBreakdownRow key={trait.trait} trait={trait} colorIndex={index} />
        ))}
      </div>

      {breakdown.missing_traits.length > 0 ? (
        <p className="rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Strengthening evidence for{" "}
          <span className="font-medium">{breakdown.missing_traits.join(", ")}</span> can improve
          this score.
        </p>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Each trait adds points based on how much the role values it and how strong your profile is
        in that area. Match points across traits add up to your {breakdown.fit_percent}% fit.
      </p>
    </div>
  )
}
