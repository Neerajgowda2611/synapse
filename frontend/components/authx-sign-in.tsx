"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

import { AuthAlert } from "@/components/auth/auth-alert"
import { AuthShell } from "@/components/auth/auth-shell"
import { authErrorMessage } from "@/components/auth/auth-error-messages"
import { Button } from "@/components/ui/button"
import { beginAuthxLogin } from "@/lib/auth/authx"

export function AuthxSignIn() {
  const searchParams = useSearchParams()
  const urlError = authErrorMessage(searchParams.get("error"))
  const [error, setError] = useState<string | null>(urlError)
  const [redirecting, setRedirecting] = useState(false)

  const handleSignIn = async () => {
    setRedirecting(true)
    setError(null)
    try {
      await beginAuthxLogin()
    } catch (err) {
      setRedirecting(false)
      setError(err instanceof Error ? err.message : "Authentication redirect failed")
    }
  }

  return (
    <AuthShell
      title="Sign in to Profiler"
      description="Use your Xcelerator account to access your learner profile and dashboards."
    >
      {error ? <AuthAlert message={error} className="mb-6" /> : null}

      <Button
        type="button"
        className="w-full"
        size="lg"
        onClick={handleSignIn}
        disabled={redirecting}
      >
        {redirecting ? "Redirecting…" : "Continue with Xcelerator"}
      </Button>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        You will be redirected to the Xcelerator identity provider to complete sign in.
      </p>
    </AuthShell>
  )
}
