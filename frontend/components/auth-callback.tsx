"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
        setError("Missing authorization code")
        return
      }

      if (!codeVerifier) {
        setError("Missing PKCE verifier — please log in again")
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/login" className="text-indigo-600 hover:underline">
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Signing you in...</p>
    </div>
  )
}
