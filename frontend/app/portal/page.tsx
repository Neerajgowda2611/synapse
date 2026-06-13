"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api/client"
import { clearAccessToken, getAccessToken } from "@/lib/config"

interface MeResponse {
  email: string
  name: string
  user_type: string
}

export default function PortalPage() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    api
      .get<MeResponse>("/api/v1/auth/me")
      .then((meData) => {
        if (meData.user_type !== "learner") {
          router.replace("/dashboard")
          return
        }
        setMe(meData)
      })
      .catch(() => {
        clearAccessToken()
        router.replace("/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  function signOut() {
    clearAccessToken()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold">Profiler</span>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900">
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border p-6">
          <h1 className="text-xl font-semibold mb-1">
            Welcome, {me?.name || me?.email}
          </h1>
          <p className="text-sm text-gray-500">Your learner profile is being built.</p>
        </div>
      </main>
    </div>
  )
}
