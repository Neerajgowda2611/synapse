"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { clearAccessToken, getAccessToken } from "@/lib/config"
import {
  DataSourceEntity,
  SchemaSnapshot,
  getMe,
  getSchema,
  listEntities,
  saveEntities,
  targetDomains,
} from "@/lib/api/data-sources"

export default function EntitySelectionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [snapshot, setSnapshot] = useState<SchemaSnapshot | null>(null)
  const [entities, setEntities] = useState<DataSourceEntity[]>([])
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    Promise.all([getMe(), getSchema(id), listEntities(id)])
      .then(([meData, schema, entityData]) => {
        if (meData.user_type !== "institution") {
          router.replace("/dashboard")
          return
        }
        setSnapshot(schema)
        setEntities(entityData.data ?? [])
        setSelected(
          Object.fromEntries(
            (entityData.data ?? []).map((entity) => [entity.source_name, entity.target_domain ?? ""])
          )
        )
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

  const tableNames = useMemo(() => {
    const fromSchema = snapshot?.schema_json.tables.map((table) => table.name) ?? []
    const fromEntities = entities.map((entity) => entity.source_name)
    return Array.from(new Set([...fromSchema, ...fromEntities])).sort()
  }, [entities, snapshot])

  async function submit() {
    setError("")
    setMessage("")
    setSaving(true)
    try {
      await saveEntities(
        id,
        tableNames.map((sourceName) => ({
          source_name: sourceName,
          target_domain: selected[sourceName] || undefined,
        }))
      )
      setMessage("Entity selections saved")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entities")
    } finally {
      setSaving(false)
    }
  }

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
            <h1 className="text-xl font-semibold text-gray-900">Select entities</h1>
            <p className="text-sm text-gray-500">Map source tables to learner profile domains.</p>
          </div>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save selections"}
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && (
          <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {tableNames.length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-400">
              Discover schema before selecting entities.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-700">Source table</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Target domain</th>
                </tr>
              </thead>
              <tbody>
                {tableNames.map((tableName) => (
                  <tr key={tableName} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">{tableName}</td>
                    <td className="px-4 py-3">
                      <select
                        value={selected[tableName] ?? ""}
                        onChange={(e) =>
                          setSelected((current) => ({ ...current, [tableName]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Do not import</option>
                        {targetDomains.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}
