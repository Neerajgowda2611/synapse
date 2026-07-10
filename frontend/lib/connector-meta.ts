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
  accent: "text-chart-3",
  accentBg: "bg-chart-3/10",
  accentBorder: "border-chart-3/30",
  typeLabel: "Integration",
}

export const connectorMeta: Record<string, ConnectorMeta> = {
  postgres: {
    label: "PostgreSQL",
    description: "Pull learner data from a PostgreSQL database. Discover tables and map them to profile domains.",
    accent: "text-chart-2",
    accentBg: "bg-chart-2/10",
    accentBorder: "border-chart-2/30",
    typeLabel: "Database",
  },
  postgresql: {
    label: "PostgreSQL",
    description: "Pull learner data from a PostgreSQL database. Discover tables and map them to profile domains.",
    accent: "text-chart-2",
    accentBg: "bg-chart-2/10",
    accentBorder: "border-chart-2/30",
    typeLabel: "Database",
  },
  webhook: {
    label: "Webhook",
    description: "Receive JSON payloads from n8n, scripts, or other systems. Schema is inferred from incoming events.",
    accent: "text-chart-4",
    accentBg: "bg-chart-4/10",
    accentBorder: "border-chart-4/30",
    typeLabel: "Push",
  },
}

export function getConnectorMeta(slug?: string): ConnectorMeta {
  if (!slug) return defaults
  return connectorMeta[slug] ?? defaults
}
