import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

export function LoadingState({
  label = "Loading...",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] items-center justify-center bg-background",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        <span>{label}</span>
      </div>
    </div>
  )
}
