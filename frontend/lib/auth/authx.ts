import {
  AUTHX_CODE_VERIFIER_KEY,
  AUTHX_FLOW_KEY,
  AUTHX_OAUTH_STATE_KEY,
} from "@/lib/config"
import { isAuthxEnabled } from "@/lib/authx-config"

function base64UrlEncode(buffer: Uint8Array): string {
  const binary = Array.from(buffer, (b) => String.fromCharCode(b)).join("")
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier))
  return base64UrlEncode(new Uint8Array(digest))
}

function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

export function getAuthxRedirectUri(origin?: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "")
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured")
  }
  return `${appUrl.replace(/\/$/, "")}/auth/callback`
}

export async function beginAuthxLogin(): Promise<void> {
  if (!isAuthxEnabled) return

  const clientId = process.env.NEXT_PUBLIC_AUTHX_CLIENT_ID
  const idpUrl = process.env.NEXT_PUBLIC_AUTH_IDP_URL

  if (!clientId || !idpUrl) {
    throw new Error(
      "AuthX client configuration is missing (NEXT_PUBLIC_AUTHX_CLIENT_ID, NEXT_PUBLIC_AUTH_IDP_URL)"
    )
  }

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = generateState()
  const redirectUri = getAuthxRedirectUri()

  sessionStorage.setItem(AUTHX_CODE_VERIFIER_KEY, codeVerifier)
  sessionStorage.setItem(AUTHX_OAUTH_STATE_KEY, state)
  sessionStorage.setItem(AUTHX_FLOW_KEY, "authx")

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  })

  window.location.href = `${idpUrl.replace(/\/$/, "")}/api/auth/oauth2/authorize?${params.toString()}`
}

export function isAuthxCallback(searchParams: URLSearchParams): boolean {
  if (!isAuthxEnabled) return false
  const flow = sessionStorage.getItem(AUTHX_FLOW_KEY)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  return flow === "authx" && Boolean(code && state)
}

export function peekAuthxCallbackState(
  searchParams: URLSearchParams
): { code: string; codeVerifier: string } | null {
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const storedState = sessionStorage.getItem(AUTHX_OAUTH_STATE_KEY)
  const codeVerifier = sessionStorage.getItem(AUTHX_CODE_VERIFIER_KEY)

  if (!code || !state || !storedState || !codeVerifier) return null
  if (state !== storedState) return null

  return { code, codeVerifier }
}

export function clearAuthxCallbackState(): void {
  sessionStorage.removeItem(AUTHX_FLOW_KEY)
  sessionStorage.removeItem(AUTHX_OAUTH_STATE_KEY)
  sessionStorage.removeItem(AUTHX_CODE_VERIFIER_KEY)
}

export interface AuthxTokenResponse {
  access_token?: string
  id_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

export async function exchangeAuthxCode(
  code: string,
  codeVerifier: string
): Promise<AuthxTokenResponse> {
  const response = await fetch("/api/auth/authx/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, codeVerifier }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || "AuthX token exchange failed")
  }
  return response.json() as Promise<AuthxTokenResponse>
}

export async function refreshAuthxToken(
  refreshToken: string
): Promise<AuthxTokenResponse> {
  const response = await fetch("/api/auth/authx/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error || "AuthX token refresh failed")
  }
  return response.json() as Promise<AuthxTokenResponse>
}
