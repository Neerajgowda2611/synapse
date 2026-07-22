import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { tone } from "@/lib/ui/status-tones"

type AlertProps = {
  variant: "success" | "error" | "info"
  children: ReactNode
  className?: string
}

export function Alert({ variant, children, className }: AlertProps) {
  const styles =
    variant === "success"
      ? tone.success.alert
      : variant === "info"
        ? "border-border bg-muted/50 text-foreground"
        : "border-destructive/25 bg-destructive/10 text-destructive"

  return (
    <p className={cn("rounded-lg border px-3 py-2 text-sm", styles, className)} role="alert">
      {children}
    </p>
  )
}
