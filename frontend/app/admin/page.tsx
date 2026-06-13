"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api/client"
import { clearAccessToken, getAccessToken } from "@/lib/config"

interface DataSource {
  id: string
  name: string
  status: string
}

interface MeResponse {
  email: string
  role: string
  user_type: string
  institution_id?: string
}

export default function AdminPage() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    api
      .get<MeResponse>("/api/v1/auth/me")
      .then((meData) => {
        if (meData.user_type !== "institution") {
          router.replace("/dashboard")
          return
        }
        setMe(meData)
        return api.get<{ data: DataSource[] }>(
          `/api/v1/data-sources?institution_id=${meData.institution_id}`
        )
      })
      .then((ds) => {
        if (ds) setDataSources(ds.data ?? [])
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
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold">Profiler</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{me?.email}</span>
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">Data Sources</h1>
        <div className="bg-white rounded-xl border overflow-hidden">
          {dataSources.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">No data sources connected yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((ds) => (
                  <tr key={ds.id} className="border-b">
                    <td className="px-4 py-3">{ds.name}</td>
                    <td className="px-4 py-3">{ds.status}</td>
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
