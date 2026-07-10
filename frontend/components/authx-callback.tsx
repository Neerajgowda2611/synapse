"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { AuthLoadingState } from "@/components/auth/auth-page-state"
import {
  clearAuthxCallbackState,
  exchangeAuthxCode,
  peekAuthxCallbackState,
} from "@/lib/auth/authx"
import { exchangeAuthxSessionToken } from "@/lib/auth/session-token"
import { AUTHX_REFRESH_TOKEN_KEY, setAccessToken } from "@/lib/config"

let callbackInFlight: Promise<void> | null = null

export function AuthxCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

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
        failTo("/login?error=authx_failed")
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
          window.localStorage.setItem(AUTHX_REFRESH_TOKEN_KEY, tokens.refresh_token)
        }

        clearAuthxCallbackState()
        router.replace("/dashboard")
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed"
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

  return (
    <AuthLoadingState
      title="Signing you in"
      description="Verifying your Xcelerator account and opening Profiler."
    />
  )
}
