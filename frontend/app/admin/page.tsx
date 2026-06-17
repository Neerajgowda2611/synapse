"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { clearAccessToken, getAccessToken } from "@/lib/config"
import { DataSource, MeResponse, getMe, listDataSources } from "@/lib/api/data-sources"

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

    getMe()
      .then((meData) => {
        if (meData.user_type !== "institution") {
          router.replace("/dashboard")
          return
        }
        setMe(meData)
        if (!meData.institution_id) return
        return listDataSources(meData.institution_id)
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Data Sources</h1>
          <button
            onClick={() => router.push("/admin/data-sources/new")}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add data source
          </button>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden">
          {dataSources.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">No data sources connected yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Connector</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((ds) => (
                  <tr
                    key={ds.id}
                    onClick={() => router.push(`/admin/data-sources/${ds.id}`)}
                    className="border-b cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">{ds.name}</td>
                    <td className="px-4 py-3">
                      {ds.connector_definition?.name ?? ds.connector_definition_id}
                    </td>
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
