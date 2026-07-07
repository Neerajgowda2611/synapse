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
        "Your Zitadel account is not linked to Profiler yet. Ask an admin to add your email to the users table."
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
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          setError("Wrong username or password.")
        } else {
          setError("Unable to sign in right now. Please try again.")
        }
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-lg shadow-primary/5">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Synapse
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with your login name and password to continue
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label htmlFor="login" className="mb-1.5 block text-sm font-medium text-foreground">
                Login name
              </label>
              <input
                id="login"
                type="text"
                required
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
