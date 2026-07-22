export const appConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  // Must match ZITADEL_REDIRECT_URI registered on the Zitadel Web app
  redirectPath: "/api/auth/callback/zitadel",
}

export const AUTH_TOKEN_KEY = "access_token"
export const AUTH_CODE_VERIFIER_KEY = "code_verifier"
export const AUTHX_REFRESH_TOKEN_KEY = "authx_refresh_token"
export const AUTHX_ID_TOKEN_KEY = "authx_id_token"
export const AUTHX_CODE_VERIFIER_KEY = "authx_code_verifier"
export const AUTHX_OAUTH_STATE_KEY = "authx_oauth_state"
export const AUTHX_FLOW_KEY = "authx_flow"
export const AUTH_REDIRECT_KEY = "auth_redirect_url"
export const AUTH_LOGOUT_RETURN_KEY = "auth_logout_return"
export const AUTHX_LOGGED_OUT_KEY = "authx_logged_out"

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function getAuthxRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(AUTHX_REFRESH_TOKEN_KEY)
}

export function setAuthxRefreshToken(token: string) {
  window.localStorage.setItem(AUTHX_REFRESH_TOKEN_KEY, token)
}

export function getAuthxIdToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(AUTHX_ID_TOKEN_KEY)
}

export function setAuthxIdToken(token: string) {
  window.localStorage.setItem(AUTHX_ID_TOKEN_KEY, token)
}

export function clearAccessToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_CODE_VERIFIER_KEY)
  window.localStorage.removeItem(AUTHX_REFRESH_TOKEN_KEY)
  window.localStorage.removeItem(AUTHX_ID_TOKEN_KEY)
}
