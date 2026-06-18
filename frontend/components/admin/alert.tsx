import type { ReactNode } from "react"

type AlertProps = {
  variant: "success" | "error"
  children: ReactNode
}

export function Alert({ variant, children }: AlertProps) {
  const styles =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-800"

  return (
    <p className={`rounded-lg border px-3 py-2 text-sm ${styles}`} role="alert">
      {children}
    </p>
  )
}
