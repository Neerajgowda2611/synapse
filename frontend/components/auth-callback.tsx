"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { AuthErrorState, AuthLoadingState } from "@/components/auth/auth-page-state"
import { appConfig, AUTH_CODE_VERIFIER_KEY, setAccessToken } from "@/lib/config"

export function AuthCallback() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get("code")
      const state = searchParams.get("state")
      const codeVerifier = sessionStorage.getItem(AUTH_CODE_VERIFIER_KEY)

      if (!code) {
        setError("Missing authorization code.")
        return
      }

      if (!codeVerifier) {
        setError("Missing PKCE verifier — please sign in again.")
        return
      }

      try {
        const res = await fetch(`${appConfig.apiUrl}/api/v1/auth/token-exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state, code_verifier: codeVerifier }),
        })

        if (!res.ok) {
          throw new Error("Token exchange failed")
        }

        const body = await res.json()
        const accessToken = body.data?.access_token
        if (!accessToken) {
          throw new Error("No access token received")
        }

        setAccessToken(accessToken)
        sessionStorage.removeItem(AUTH_CODE_VERIFIER_KEY)
        router.replace("/dashboard")
      } catch {
        setError("Authentication failed. Please try again.")
      }
    }

    run()
  }, [searchParams, router])

  if (error) {
    return <AuthErrorState title="Sign in failed" error={error} />
  }

  return (
    <AuthLoadingState
      title="Signing you in"
      description="Completing authentication and preparing your workspace."
    />
  )
}
