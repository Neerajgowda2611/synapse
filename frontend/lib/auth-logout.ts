"use client"

import {
  AUTH_LOGOUT_RETURN_KEY,
  AUTHX_LOGGED_OUT_KEY,
  AUTH_REDIRECT_KEY,
  clearAccessToken,
  getAuthxIdToken,
  getAuthxRefreshToken,
} from "@/lib/config"
import { isAuthxEnabled } from "@/lib/authx-config"
import { revokeAuthxSession } from "@/lib/auth/session-token"

export async function performLogout(returnTo?: string): Promise<void> {
  const idpUrl = process.env.NEXT_PUBLIC_AUTH_IDP_URL

  if (typeof window !== "undefined") {
    sessionStorage.setItem(AUTHX_LOGGED_OUT_KEY, "1")
    const refreshToken = getAuthxRefreshToken()
    if (isAuthxEnabled && refreshToken) {
      await revokeAuthxSession(refreshToken)
    }
  }

  if (!isAuthxEnabled || !idpUrl) {
    clearAccessToken()
    window.location.replace(returnTo ?? "/login")
    return
  }

  const destination = returnTo ?? "/login"
  const idToken = getAuthxIdToken()

  sessionStorage.setItem(AUTH_LOGOUT_RETURN_KEY, destination)
  sessionStorage.removeItem(AUTH_REDIRECT_KEY)

  const params = new URLSearchParams({
    post_logout_redirect_uri: `${window.location.origin}/logout/callback`,
  })
  if (idToken) {
    params.set("id_token_hint", idToken)
  }

  // Clear local tokens after capturing id_token_hint for the IdP logout request.
  clearAccessToken()

  window.location.href = `${idpUrl.replace(/\/$/, "")}/api/oauth2/endsession?${params.toString()}`
}
