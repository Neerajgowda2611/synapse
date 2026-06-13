"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { appConfig, AUTH_CODE_VERIFIER_KEY, clearAccessToken } from "@/lib/config"

function LoginForm() {
  const searchParams = useSearchParams()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Clear stale tokens from previous auth attempts
    clearAccessToken()
    sessionStorage.removeItem(AUTH_CODE_VERIFIER_KEY)

    const urlError = searchParams.get("error")
    if (urlError === "user_not_provisioned") {
      setError(
        "Your Zitadel account is not linked to Profiler yet. Ask an admin to add your email to platform_admins (or institution_users)."
      )
    }
  }, [searchParams])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${appConfig.apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: login.trim(),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Login failed")
        return
      }

      // Store PKCE verifier for token exchange on callback page
      sessionStorage.setItem(AUTH_CODE_VERIFIER_KEY, data.code_verifier)

      // Same pattern as other Xcelerator apps: redirect to /auth/callback
      window.location.href = `${appConfig.redirectPath}?code=${encodeURIComponent(data.code)}&state=${encodeURIComponent(data.state)}`
    } catch {
      setError("Unable to reach the server. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Profiler</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in with your Zitadel login name and password
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-1">
                Login name
              </label>
              <input
                id="login"
                type="text"
                required
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Neerajgowda"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
