export type SetupStepId = "credentials" | "verify" | "discover" | "entities" | "data"

export type SetupStepStatus = "complete" | "current" | "upcoming"

export type SetupStep = {
  id: SetupStepId
  label: string
  description: string
  status: SetupStepStatus
}

export type SetupProgress = {
  hasCredentials: boolean
  hasSchema: boolean
  mappedCount: number
  totalSources: number
  hasData: boolean
}

export function buildSetupSteps(
  isWebhook: boolean,
  progress: SetupProgress,
  activeStepId?: SetupStepId
): SetupStep[] {
  const { hasCredentials, hasSchema, mappedCount, totalSources, hasData } = progress

  const credentialsComplete = hasCredentials
  const verifyComplete = hasCredentials && hasSchema
  const discoverComplete = hasSchema
  const entitiesComplete = totalSources > 0 && mappedCount > 0
  const dataComplete = hasData

  const defaultCurrent: SetupStepId = !credentialsComplete
    ? "credentials"
    : !hasSchema
      ? "verify"
      : mappedCount === 0 && totalSources > 0
        ? "entities"
        : !hasData
          ? "data"
          : "data"

  const current = activeStepId ?? defaultCurrent

  function statusFor(
    stepId: SetupStepId,
    complete: boolean,
    order: number
  ): SetupStepStatus {
    if (complete) return "complete"
    const currentOrder = stepOrder(current)
    if (order === currentOrder) return "current"
    if (order < currentOrder) return "complete"
    return "upcoming"
  }

  return [
    {
      id: "credentials",
      label: isWebhook ? "Ingest URL" : "Credentials",
      description: isWebhook
        ? "Generate a secure token and copy your endpoint."
        : "Save database host, user, and password.",
      status: statusFor("credentials", credentialsComplete, 0),
    },
    {
      id: "verify",
      label: "Verify",
      description: isWebhook ? "Confirm the endpoint is ready." : "Test the database connection.",
      status: statusFor("verify", verifyComplete, 1),
    },
    {
      id: "discover",
      label: "Discover",
      description: isWebhook
        ? "Infer schema from received payloads."
        : "Scan tables and columns from the database.",
      status: statusFor("discover", discoverComplete, 2),
    },
    {
      id: "entities",
      label: "Map entities",
      description: "Assign sources to learner profile domains.",
      status: statusFor("entities", entitiesComplete, 3),
    },
    {
      id: "data",
      label: "Collected data",
      description: isWebhook
        ? "Browse observations received from this webhook."
        : "Browse raw records synced from this connector.",
      status: statusFor("data", dataComplete, 4),
    },
  ]
}

function stepOrder(stepId: SetupStepId): number {
  const order: SetupStepId[] = ["credentials", "verify", "discover", "entities", "data"]
  return order.indexOf(stepId)
}

export function setupStepHref(dataSourceId: string, stepId: SetupStepId): string {
  const base = `/admin/data-sources/${dataSourceId}`
  switch (stepId) {
    case "entities":
      return `${base}/entities`
    case "data":
      return `${base}/data`
    default:
      return base
  }
}
