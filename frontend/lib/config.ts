export const appConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  // Must match ZITADEL_REDIRECT_URI registered on the Zitadel Web app
  redirectPath: "/api/auth/callback/zitadel",
}

export const AUTH_TOKEN_KEY = "access_token"
export const AUTH_CODE_VERIFIER_KEY = "code_verifier"

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAccessToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_CODE_VERIFIER_KEY)
}
