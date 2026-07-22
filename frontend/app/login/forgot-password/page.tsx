import Link from "next/link"
import { ArrowLeft, Lock } from "lucide-react"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      description="Password recovery is managed by your identity provider."
    >
      <div className="space-y-6">
        <div className="flex gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Self-service password reset is not available in Profiler yet. Contact your institution
            administrator or platform operator to reset your login credentials.
          </p>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link href="/login">
            <ArrowLeft data-icon="inline-start" />
            Back to sign in
          </Link>
        </Button>
      </div>
    </AuthShell>
  )
}
