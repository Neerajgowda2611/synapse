"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { clearAccessToken, getAccessToken } from "@/lib/config"
import { SchemaSnapshot, getMe, getSchema } from "@/lib/api/data-sources"

export default function SchemaExplorerPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [snapshot, setSnapshot] = useState<SchemaSnapshot | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    Promise.all([getMe(), getSchema(id)])
      .then(([meData, schema]) => {
        if (meData.user_type !== "institution") {
          router.replace("/dashboard")
          return
        }
        setSnapshot(schema)
      })
      .catch((err) => {
        if (err instanceof Error) {
          setError(err.message)
          return
        }
        clearAccessToken()
        router.replace("/login")
      })
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push(`/admin/data-sources/${id}`)}
          className="mb-6 text-sm text-gray-500 hover:text-gray-900"
        >
          Back to data source
        </button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Schema explorer</h1>
            <p className="text-sm text-gray-500">Snapshot version {snapshot?.version ?? "-"}</p>
          </div>
          <button
            onClick={() => router.push(`/admin/data-sources/${id}/entities`)}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Select entities
          </button>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {(snapshot?.schema_json.tables ?? []).map((table) => (
              <div key={table.name} className="border-b border-gray-100 last:border-b-0">
                <button
                  onClick={() =>
                    setExpanded((current) => ({ ...current, [table.name]: !current[table.name] }))
                  }
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  <span>{table.name}</span>
                  <span className="text-xs text-gray-500">{table.columns.length} columns</span>
                </button>
                {expanded[table.name] && (
                  <div className="bg-gray-50 px-4 py-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="py-2 font-medium">Column</th>
                          <th className="py-2 font-medium">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.columns.map((column) => (
                          <tr key={column.name} className="border-t border-gray-200">
                            <td className="py-2 text-gray-900">{column.name}</td>
                            <td className="py-2 text-gray-600">{column.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
