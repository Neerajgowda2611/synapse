import { appConfig } from "@/lib/config"

export interface ProfilerSessionTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  token_type: string
}

export async function exchangeAuthxSessionToken(
  idToken: string
): Promise<ProfilerSessionTokenResponse> {
  const response = await fetch(
    `${appConfig.apiUrl}/api/v1/auth/authx/session-token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    }
  )
  const data = (await response.json().catch(() => ({}))) as
    ProfilerSessionTokenResponse & { error?: string }
  if (!response.ok || !data.access_token) {
    throw new Error(data.error || "Failed to exchange AuthX session token")
  }
  return data
}

/**
 * Revoke the AuthX offline_access refresh token server-side so an explicit
 * logout cannot be silently re-minted. Best-effort: never throws.
 */
export async function revokeAuthxSession(refreshToken: string): Promise<void> {
  try {
    await fetch(`${appConfig.apiUrl}/api/v1/auth/authx/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  } catch (error) {
    console.error("AuthX session revoke failed:", error)
  }
}

export async function refreshAuthxSession(
  refreshToken: string
): Promise<ProfilerSessionTokenResponse> {
  const response = await fetch(
    `${appConfig.apiUrl}/api/v1/auth/authx/refresh-session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  )
  const data = (await response.json().catch(() => ({}))) as
    ProfilerSessionTokenResponse & { error?: string }
  if (!response.ok || !data.access_token) {
    throw new Error(data.error || "Failed to refresh AuthX session")
  }
  return data
}
