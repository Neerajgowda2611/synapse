import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type ErrorStateProps = {
  title?: string
  message: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn("rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center", className)}
      role="alert"
    >
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  )
}
