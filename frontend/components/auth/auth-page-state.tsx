import Link from "next/link"
import { Loader2 } from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { AuthAlert } from "@/components/auth/auth-alert"
import { Button } from "@/components/ui/button"

type AuthPageStateProps = {
  title: string
  description?: string
}

export function AuthLoadingState({
  title,
  description = "Please wait while we complete your request.",
}: AuthPageStateProps) {
  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </AuthShell>
  )
}

type AuthErrorStateProps = AuthPageStateProps & {
  error: string
  backHref?: string
  backLabel?: string
}

export function AuthErrorState({
  title,
  error,
  backHref = "/login",
  backLabel = "Back to sign in",
}: AuthErrorStateProps) {
  return (
    <AuthShell title={title}>
      <div className="space-y-6">
        <AuthAlert message={error} />
        <Button asChild variant="outline" className="w-full">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </div>
    </AuthShell>
  )
}
