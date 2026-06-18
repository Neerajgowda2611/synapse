export interface ConnectorMeta {
  label: string
  description: string
  accent: string
  accentBg: string
  accentBorder: string
  typeLabel: string
}

const defaults: ConnectorMeta = {
  label: "Connector",
  description: "Connect an external system to Profiler.",
  accent: "text-slate-700",
  accentBg: "bg-slate-50",
  accentBorder: "border-slate-200",
  typeLabel: "Integration",
}

export const connectorMeta: Record<string, ConnectorMeta> = {
  postgres: {
    label: "PostgreSQL",
    description: "Pull learner data from a PostgreSQL database. Discover tables and map them to profile domains.",
    accent: "text-blue-700",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    typeLabel: "Database",
  },
  postgresql: {
    label: "PostgreSQL",
    description: "Pull learner data from a PostgreSQL database. Discover tables and map them to profile domains.",
    accent: "text-blue-700",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    typeLabel: "Database",
  },
  webhook: {
    label: "Webhook",
    description: "Receive JSON payloads from n8n, scripts, or other systems. Schema is inferred from incoming events.",
    accent: "text-violet-700",
    accentBg: "bg-violet-50",
    accentBorder: "border-violet-200",
    typeLabel: "Push",
  },
}

export function getConnectorMeta(slug?: string): ConnectorMeta {
  if (!slug) return defaults
  return connectorMeta[slug] ?? defaults
}
