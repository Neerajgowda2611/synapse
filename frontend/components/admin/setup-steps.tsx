import { cn } from "@/lib/utils"
import { tone } from "@/lib/ui/status-tones"
import type { SetupStep } from "@/lib/admin/setup-steps"

type SetupStepsProps = {
  steps: SetupStep[]
  activeStepId: string
  onStepClick: (id: string) => void
  compact?: boolean
}

export function SetupSteps({ steps, activeStepId, onStepClick, compact }: SetupStepsProps) {
  return (
    <ol
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-5"
      )}
    >
      {steps.map((step, index) => {
        const selected = activeStepId === step.id

        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              aria-current={selected ? "step" : undefined}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left transition",
                selected
                  ? "border-foreground bg-card shadow-sm ring-1 ring-foreground"
                  : step.status === "complete"
                    ? `${tone.success.border} ${tone.success.bgSubtle} hover:border-chart-2/40`
                    : "border-border bg-card hover:border-border/80"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.status === "complete"
                      ? tone.success.solid
                      : selected
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.status === "complete" ? "✓" : index + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{step.label}</span>
              </div>
              {!compact ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              ) : null}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
