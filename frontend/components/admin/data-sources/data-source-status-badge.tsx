import { Badge } from "@/components/ui/badge"
import { tone } from "@/lib/ui/status-tones"
import { cn } from "@/lib/utils"

export function DataSourceStatusBadge({ status }: { status: string }) {
  const active = status === "active"
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full font-normal capitalize",
        active ? tone.active.badge : "text-muted-foreground"
      )}
    >
      {status}
    </Badge>
  )
}
