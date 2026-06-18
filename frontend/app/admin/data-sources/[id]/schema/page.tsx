"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminShell } from "@/components/admin/admin-shell"
import { Alert } from "@/components/admin/alert"
import { LoadingState } from "@/components/admin/loading-state"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SchemaSnapshot, getDataSource, getSchema } from "@/lib/api/data-sources"

export default function SchemaExplorerPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { me, loading: authLoading } = useAdminAuth()
  const [dataSourceName, setDataSourceName] = useState("")
  const [snapshot, setSnapshot] = useState<SchemaSnapshot | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    Promise.all([getDataSource(id), getSchema(id)])
      .then(([ds, schema]) => {
        setDataSourceName(ds.name)
        setSnapshot(schema)
      })
      .catch((err) => {
        if (err instanceof Error) {
          setError(err.message)
          return
        }
        setError("Failed to load schema")
      })
      .finally(() => setLoading(false))
  }, [authLoading, id])

  if (authLoading || loading) {
    return <LoadingState />
  }

  const tables = snapshot?.schema_json.tables ?? []

  return (
    <AdminShell
      email={me?.email}
      title="Schema explorer"
      description={`Snapshot v${snapshot?.version ?? "-"} · ${tables.length} ${tables.length === 1 ? "entity" : "entities"} discovered`}
      breadcrumbs={[
        { label: "Data sources", href: "/admin" },
        { label: dataSourceName, href: `/admin/data-sources/${id}` },
        { label: "Schema" },
      ]}
      action={
        <button
          onClick={() => router.push(`/admin/data-sources/${id}/entities`)}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Map entities
        </button>
      }
    >
      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : tables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No schema snapshot found. Run discovery from the data source page.</p>
          <button
            onClick={() => router.push(`/admin/data-sources/${id}`)}
            className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to setup
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {tables.map((table) => (
            <div key={table.name} className="border-b border-gray-100 last:border-b-0">
              <button
                onClick={() =>
                  setExpanded((current) => ({ ...current, [table.name]: !current[table.name] }))
                }
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{table.name}</p>
                  <p className="text-xs text-gray-500">{table.columns.length} fields</p>
                </div>
                <span className="text-xs text-gray-400">{expanded[table.name] ? "Hide" : "Show"}</span>
              </button>
              {expanded[table.name] && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="py-2 font-medium">Field</th>
                        <th className="py-2 font-medium">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map((column) => (
                        <tr key={column.name} className="border-t border-gray-200/80">
                          <td className="py-2 font-mono text-xs text-gray-900">{column.name}</td>
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
    </AdminShell>
  )
}
