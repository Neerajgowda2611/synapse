import { getConnectorMeta } from "@/lib/connector-meta"
import { ConnectorIcon } from "./connector-icon"

type ConnectorBadgeProps = {
  slug?: string
  name?: string
  size?: "sm" | "md"
}

export function ConnectorBadge({ slug, name, size = "md" }: ConnectorBadgeProps) {
  const meta = getConnectorMeta(slug)
  const label = name ?? meta.label
  const compact = size === "sm"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${meta.accentBg} ${meta.accentBorder} ${meta.accent} ${
        compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
    >
      <ConnectorIcon slug={slug} className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {label}
    </span>
  )
}
