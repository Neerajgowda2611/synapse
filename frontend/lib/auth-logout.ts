"use client"

import {
  AUTH_LOGOUT_RETURN_KEY,
  AUTHX_LOGGED_OUT_KEY,
  AUTH_REDIRECT_KEY,
  clearAccessToken,
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

    clearAccessToken()
  }

  if (!isAuthxEnabled || !idpUrl) {
    window.location.replace(returnTo ?? "/login")
    return
  }

  const destination = returnTo ?? "/login"

  if (typeof window !== "undefined") {
    sessionStorage.setItem(AUTH_LOGOUT_RETURN_KEY, destination)
    sessionStorage.removeItem(AUTH_REDIRECT_KEY)
  }

  const postLogoutRedirect = encodeURIComponent(
    `${window.location.origin}/logout/callback`
  )

  window.location.href = `${idpUrl.replace(/\/$/, "")}/api/oauth2/endsession?post_logout_redirect_uri=${postLogoutRedirect}`
}
