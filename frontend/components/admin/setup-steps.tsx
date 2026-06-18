type SetupStep = {
  id: string
  label: string
  description: string
  status: "complete" | "current" | "upcoming"
}

type SetupStepsProps = {
  steps: SetupStep[]
  activeStepId: string
  onStepClick: (id: string) => void
}

export function SetupSteps({ steps, activeStepId, onStepClick }: SetupStepsProps) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((step, index) => {
        const selected = activeStepId === step.id

        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-gray-900 bg-white shadow-sm ring-1 ring-gray-900"
                  : step.status === "complete"
                    ? "border-emerald-200 bg-emerald-50/60 hover:border-emerald-300"
                    : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    step.status === "complete"
                      ? "bg-emerald-600 text-white"
                      : selected
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {step.status === "complete" ? "✓" : index + 1}
                </span>
                <span className="text-sm font-medium text-gray-900">{step.label}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-gray-500">{step.description}</p>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
