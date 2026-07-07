"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import {
  clearAuthxCallbackState,
  exchangeAuthxCode,
  peekAuthxCallbackState,
} from "@/lib/auth/authx"
import { exchangeAuthxSessionToken } from "@/lib/auth/session-token"
import { AUTHX_REFRESH_TOKEN_KEY, setAccessToken } from "@/lib/config"

// Guard against React StrictMode double-invocation consuming the OAuth code twice.
let callbackInFlight: Promise<void> | null = null

export function AuthxCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (callbackInFlight) {
      void callbackInFlight
      return
    }

    const failTo = (path: string) => {
      clearAuthxCallbackState()
      window.location.replace(path)
    }

    const run = async () => {
      const state = peekAuthxCallbackState(searchParams)
      if (!state) {
        setError("Invalid or missing callback parameters")
        failTo("/login")
        return
      }

      try {
        const tokens = await exchangeAuthxCode(state.code, state.codeVerifier)
        if (!tokens.id_token) {
          throw new Error("AuthX did not return an id_token")
        }
        const session = await exchangeAuthxSessionToken(tokens.id_token)

        setAccessToken(session.access_token)
        if (tokens.refresh_token) {
          window.localStorage.setItem(
            AUTHX_REFRESH_TOKEN_KEY,
            tokens.refresh_token
          )
        }

        clearAuthxCallbackState()
        router.replace("/dashboard")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed"
        setError(message)
        const errorParam = message.includes("user_not_provisioned")
          ? "user_not_provisioned"
          : "authx_failed"
        failTo(`/login?error=${errorParam}`)
      }
    }

    callbackInFlight = run().finally(() => {
      callbackInFlight = null
    })
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-gray-50 text-center">
        <p className="text-red-600">{error}</p>
        <a href="/login" className="text-sm text-indigo-600 underline">
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Signing you in…</p>
    </div>
  )
}
