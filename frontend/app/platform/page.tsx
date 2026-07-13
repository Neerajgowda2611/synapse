"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api/client"
import { clearAccessToken, getAccessToken } from "@/lib/config"
import { performLogout } from "@/lib/auth-logout"

interface Institution {
  id: string
  name: string
  type?: string
  status: string
}

interface MeResponse {
  email: string
  user_type: string
}

export default function PlatformPage() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    Promise.all([
      api.get<MeResponse>("/api/v1/auth/me"),
      api.get<{ data: Institution[] }>("/api/v1/institutions"),
    ])
      .then(([meData, instData]) => {
        if (meData.user_type !== "platform") {
          router.replace("/dashboard")
          return
        }
        setMe(meData)
        setInstitutions(instData.data ?? [])
      })
      .catch(() => {
        clearAccessToken()
        router.replace("/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  function signOut() {
    void performLogout("/login")
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
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">Profiler</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{me?.email}</span>
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Institutions</h1>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {institutions.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">No institutions yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 text-gray-700 font-medium">Name</th>
                  <th className="px-4 py-3 text-gray-700 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr key={inst.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">{inst.name}</td>
                    <td className="px-4 py-3 text-gray-700">{inst.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
