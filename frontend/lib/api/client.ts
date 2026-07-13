import {
  appConfig,
  getAccessToken,
  getAuthxRefreshToken,
  setAccessToken,
  setAuthxRefreshToken,
  clearAccessToken,
} from "@/lib/config"
import { isAuthxEnabled } from "@/lib/authx-config"
import { refreshAuthxSession } from "@/lib/auth/session-token"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

let refreshInFlight: Promise<string | null> | null = null

async function tryRefreshAccessToken(): Promise<string | null> {
  if (!isAuthxEnabled) return null
  const refreshToken = getAuthxRefreshToken()
  if (!refreshToken) return null

  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const data = await refreshAuthxSession(refreshToken)
      setAccessToken(data.access_token)
      if (data.refresh_token) {
        setAuthxRefreshToken(data.refresh_token)
      }
      return data.access_token
    } catch {
      clearAccessToken()
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
  retried = false
): Promise<T> {
  const token = getAccessToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${appConfig.apiUrl}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && !retried) {
    const refreshed = await tryRefreshAccessToken()
    if (refreshed) {
      return apiClient<T>(path, options, true)
    }
  }

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `API error ${res.status}: ${path}`
    throw new ApiError(res.status, message, body)
  }

  if (res.status === 204) return undefined as T

  return res.json()
}

export const api = {
  get: <T>(path: string) => apiClient<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiClient<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiClient<T>(path, { method: "PUT", body: JSON.stringify(body) }),
}
