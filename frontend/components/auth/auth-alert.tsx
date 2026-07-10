import { AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

type AuthAlertProps = {
  message: string
  className?: string
}

export function AuthAlert({ message, className }: AuthAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive",
        className
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  )
}
