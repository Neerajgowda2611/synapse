"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Alert } from "@/components/admin/alert"
import { LoadingState } from "@/components/admin/loading-state"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  DataSourceEntity,
  SchemaSnapshot,
  getDataSource,
  getSchema,
  listEntities,
  saveEntities,
  targetDomains,
} from "@/lib/api/data-sources"

export default function EntitySelectionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { me, loading: authLoading } = useAdminAuth()
  const [dataSourceName, setDataSourceName] = useState("")
  const [snapshot, setSnapshot] = useState<SchemaSnapshot | null>(null)
  const [entities, setEntities] = useState<DataSourceEntity[]>([])
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authLoading) return

    Promise.all([getDataSource(id), getSchema(id), listEntities(id)])
      .then(([ds, schema, entityData]) => {
        setDataSourceName(ds.name)
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
        setError("Failed to load entities")
      })
      .finally(() => setLoading(false))
  }, [authLoading, id])

  const tableNames = useMemo(() => {
    const fromSchema = snapshot?.schema_json.tables.map((table) => table.name) ?? []
    const fromEntities = entities.map((entity) => entity.source_name)
    return Array.from(new Set([...fromSchema, ...fromEntities])).sort()
  }, [entities, snapshot])

  const mappedCount = useMemo(
    () => tableNames.filter((name) => selected[name]).length,
    [selected, tableNames]
  )

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
      setMessage(`Saved mappings for ${mappedCount} ${mappedCount === 1 ? "entity" : "entities"}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entities")
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingState />
  }

  return (
    <>
      <PageHeader
        title="Map entities"
        description="Assign each source table or event type to a learner profile domain."
        breadcrumbs={[
          { label: "Data sources", href: "/admin" },
          { label: dataSourceName, href: `/admin/data-sources/${id}` },
          { label: "Entities" },
        ]}
        action={
          <button
            onClick={submit}
            disabled={saving || tableNames.length === 0}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save mappings"}
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span>{tableNames.length} sources</span>
        <span className="text-gray-300">·</span>
        <span>{mappedCount} mapped</span>
        <button
          onClick={() => router.push(`/admin/data-sources/${id}/schema`)}
          className="text-gray-700 underline-offset-2 hover:underline"
        >
          View schema
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {message && (
        <div className="mb-4">
          <Alert variant="success">{message}</Alert>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {tableNames.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">Discover schema before mapping entities.</p>
            <button
              onClick={() => router.push(`/admin/data-sources/${id}`)}
              className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Go to setup
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Profile domain</th>
              </tr>
            </thead>
            <tbody>
              {tableNames.map((tableName) => {
                const mapped = Boolean(selected[tableName])
                return (
                  <tr
                    key={tableName}
                    className={`border-b border-gray-100 ${mapped ? "bg-emerald-50/30" : ""}`}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{tableName}</p>
                      <p className="text-xs text-gray-500">{mapped ? "Will import" : "Skipped"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={selected[tableName] ?? ""}
                        onChange={(e) =>
                          setSelected((current) => ({ ...current, [tableName]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
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
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
