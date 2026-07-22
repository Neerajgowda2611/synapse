"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

import { AuthAlert } from "@/components/auth/auth-alert"
import { AuthShell } from "@/components/auth/auth-shell"
import { authErrorMessage } from "@/components/auth/auth-error-messages"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  appConfig,
  AUTH_CODE_VERIFIER_KEY,
  AUTH_REDIRECT_KEY,
  clearAccessToken,
} from "@/lib/config"

function safeCallbackUrl(value: string | null): string | null {
  if (!value) return null
  if (value.startsWith("/") && !value.startsWith("//")) return value
  return null
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(() =>
    authErrorMessage(searchParams.get("error"))
  )
  const [loading, setLoading] = useState(false)
  const callbackUrl = safeCallbackUrl(
    searchParams.get("callbackUrl") || searchParams.get("next")
  )

  useEffect(() => {
    clearAccessToken()
    sessionStorage.removeItem(AUTH_CODE_VERIFIER_KEY)
    if (callbackUrl) {
      sessionStorage.setItem(AUTH_REDIRECT_KEY, callbackUrl)
    } else {
      sessionStorage.removeItem(AUTH_REDIRECT_KEY)
    }
  }, [callbackUrl])

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

      if (!res.ok) {
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          setError("Wrong username or password.")
        } else {
          setError("Unable to sign in right now. Please try again.")
        }
        return
      }

      const data = await res.json()
      sessionStorage.setItem(AUTH_CODE_VERIFIER_KEY, data.code_verifier)
      window.location.href = `${appConfig.redirectPath}?code=${encodeURIComponent(data.code)}&state=${encodeURIComponent(data.state)}`
    } catch {
      setError("Unable to reach the server. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with your login name and password to continue."
    >
      {error ? <AuthAlert message={error} className="mb-6" /> : null}

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login">Login name</Label>
          <Input
            id="login"
            type="text"
            required
            autoComplete="username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/login/forgot-password"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  )
}
