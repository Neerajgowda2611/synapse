"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

import { AuthAlert } from "@/components/auth/auth-alert"
import { AuthShell } from "@/components/auth/auth-shell"
import { authErrorMessage } from "@/components/auth/auth-error-messages"
import { Button } from "@/components/ui/button"
import { beginAuthxLogin } from "@/lib/auth/authx"
import { AUTH_REDIRECT_KEY } from "@/lib/config"

function errorMessage(code: string | null): string | null {
  switch (code) {
    case "user_not_provisioned":
      return "Your Xcelerator account is not linked to Profiler yet. Contact your administrator."
    case "authx_sub_mismatch":
      return "This Xcelerator account is linked to a different Profiler user. Contact your administrator."
    case "authx_failed":
      return "Sign in failed. Please try again."
    case "auth_failed":
      return "Authentication failed. Please try again."
    default:
      return null
  }
}

function safeCallbackUrl(value: string | null): string | undefined {
  if (!value) return undefined
  if (value.startsWith("/") && !value.startsWith("//")) return value
  return undefined
}

export function AuthxSignIn() {
  const searchParams = useSearchParams()
  const urlError = errorMessage(searchParams.get("error"))
  const callbackUrl = safeCallbackUrl(
    searchParams.get("callbackUrl") || searchParams.get("next")
  )
  const [error, setError] = useState<string | null>(urlError)
  const [redirecting, setRedirecting] = useState(false)

  const handleSignIn = async () => {
    setRedirecting(true)
    setError(null)
    try {
      if (callbackUrl) {
        sessionStorage.setItem(AUTH_REDIRECT_KEY, callbackUrl)
      }
      await beginAuthxLogin(callbackUrl)
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
