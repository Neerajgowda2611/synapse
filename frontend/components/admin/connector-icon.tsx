import { Database, Webhook, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const CONNECTOR_ICONS: Record<string, LucideIcon> = {
  postgres: Database,
  postgresql: Database,
  webhook: Webhook,
}

type ConnectorIconProps = {
  slug?: string
  className?: string
}

export function ConnectorIcon({ slug, className = "size-4" }: ConnectorIconProps) {
  const Icon = (slug && CONNECTOR_ICONS[slug]) || Database
  return <Icon className={cn(className)} aria-hidden />
}
