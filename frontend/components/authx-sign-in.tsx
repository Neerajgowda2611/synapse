"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

import { beginAuthxLogin } from "@/lib/auth/authx"

function errorMessage(code: string | null): string | null {
  switch (code) {
    case "user_not_provisioned":
      return "Your Xcelerator account is not linked to Profiler yet. Contact your administrator."
    case "authx_sub_mismatch":
      return "This Xcelerator account is linked to a different Profiler user. Contact your administrator."
    case "authx_failed":
      return "Sign in failed. Please try again."
    case "auth_failed":
      return "Authentication failed. Please try again."
    default:
      return null
  }
}

export function AuthxSignIn() {
  const searchParams = useSearchParams()
  const urlError = errorMessage(searchParams.get("error"))
  const [error, setError] = useState<string | null>(urlError)
  const [redirecting, setRedirecting] = useState(false)

  const handleSignIn = async () => {
    setRedirecting(true)
    setError(null)
    try {
      await beginAuthxLogin()
    } catch (err) {
      setRedirecting(false)
      setError(err instanceof Error ? err.message : "Authentication redirect failed")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Profiler</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in with your Xcelerator account
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSignIn}
            disabled={redirecting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {redirecting ? "Redirecting…" : "Sign in with Xcelerator"}
          </button>
        </div>
      </div>
    </div>
  )
}
