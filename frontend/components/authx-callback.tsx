"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { AuthLoadingState } from "@/components/auth/auth-page-state"
import {
  clearAuthxCallbackState,
  exchangeAuthxCode,
  peekAuthxCallbackState,
} from "@/lib/auth/authx"
import { exchangeAuthxSessionToken } from "@/lib/auth/session-token"
import {
  AUTH_REDIRECT_KEY,
  AUTHX_LOGGED_OUT_KEY,
  AUTHX_REFRESH_TOKEN_KEY,
  setAccessToken,
  setAuthxIdToken,
} from "@/lib/config"

let callbackInFlight: Promise<void> | null = null

function safeRedirectPath(value: string | null): string | null {
  if (!value) return null
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  if (value.startsWith("/") && !value.startsWith("//")) return value
  return null
}

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

    const finish = (path: string) => {
      clearAuthxCallbackState()
      if (path.startsWith("http://") || path.startsWith("https://")) {
        window.location.replace(path)
        return
      }
      router.replace(path)
    }

    const run = async () => {
      // Reaching the OIDC callback means the user is interactively signing in
      // again, so lift the post-logout suppression.
      sessionStorage.removeItem(AUTHX_LOGGED_OUT_KEY)

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
        setAuthxIdToken(tokens.id_token)
        if (tokens.refresh_token) {
          window.localStorage.setItem(AUTHX_REFRESH_TOKEN_KEY, tokens.refresh_token)
        }
        if (session.refresh_token) {
          window.localStorage.setItem(
            AUTHX_REFRESH_TOKEN_KEY,
            session.refresh_token
          )
        }

        const storedRedirect = safeRedirectPath(
          sessionStorage.getItem(AUTH_REDIRECT_KEY)
        )
        sessionStorage.removeItem(AUTH_REDIRECT_KEY)
        clearAuthxCallbackState()
        finish(storedRedirect || "/dashboard")
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
