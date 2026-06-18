"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminShell } from "@/components/admin/admin-shell"
import { Alert } from "@/components/admin/alert"
import { ConnectorBadge } from "@/components/admin/connector-badge"
import { LoadingState } from "@/components/admin/loading-state"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  DataSource,
  EntityTypeCount,
  RawRecord,
  getDataSource,
  listRawRecords,
} from "@/lib/api/data-sources"

const PAGE_SIZE = 25

function formatTime(value: string) {
  return new Date(value).toLocaleString()
}

function payloadPreview(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload)
  return text.length > 120 ? `${text.slice(0, 120)}…` : text
}

export default function CollectedDataPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { me, loading: authLoading } = useAdminAuth()
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [records, setRecords] = useState<RawRecord[]>([])
  const [byEntity, setByEntity] = useState<EntityTypeCount[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [entityFilter, setEntityFilter] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadRecords = useCallback(
    async (nextOffset: number, entityType: string, silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError("")

      try {
        const response = await listRawRecords(id, {
          limit: PAGE_SIZE,
          offset: nextOffset,
          entity_type: entityType || undefined,
        })
        setRecords(response.data ?? [])
        setByEntity(response.by_entity_type ?? [])
        setTotal(response.total ?? 0)
        setOffset(nextOffset)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load records")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [id]
  )

  useEffect(() => {
    if (authLoading) return
    getDataSource(id)
      .then(setDataSource)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load data source"))
  }, [authLoading, id])

  useEffect(() => {
    if (authLoading) return
    void loadRecords(0, entityFilter)
  }, [authLoading, entityFilter, loadRecords])

  if (authLoading || (loading && records.length === 0 && !error)) {
    return <LoadingState />
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const grandTotal = byEntity.reduce((sum, item) => sum + item.count, 0)

  return (
    <AdminShell
      email={me?.email}
      title="Collected data"
      description={
        grandTotal > 0
          ? `${grandTotal} raw ${grandTotal === 1 ? "record" : "records"} stored from this connector.`
          : "Incoming records appear here after webhook ingestion or a future database sync."
      }
      breadcrumbs={[
        { label: "Data sources", href: "/admin" },
        { label: dataSource?.name ?? "Data source", href: `/admin/data-sources/${id}` },
        { label: "Collected data" },
      ]}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {dataSource?.connector_definition && (
            <ConnectorBadge
              slug={dataSource.connector_definition.slug}
              name={dataSource.connector_definition.name}
            />
          )}
          <button
            onClick={() => void loadRecords(offset, entityFilter, true)}
            disabled={refreshing}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {byEntity.length > 0 && (
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">By entity type</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setEntityFilter("")}
              className={`rounded-full border px-3 py-1 text-sm ${
                entityFilter === ""
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              All ({grandTotal})
            </button>
            {byEntity.map((item) => (
              <button
                key={item.entity_type}
                onClick={() => setEntityFilter(item.entity_type)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  entityFilter === item.entity_type
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.entity_type} ({item.count})
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {records.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-gray-900">No records yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {dataSource?.connector_definition?.slug === "webhook"
                ? "Send a JSON payload to your ingest URL, then refresh this page."
                : "Records will appear here once data is ingested or synced from the source."}
            </p>
            <button
              onClick={() => router.push(`/admin/data-sources/${id}`)}
              className="mt-6 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to setup
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-medium">Received</th>
                    <th className="px-5 py-3 font-medium">Entity</th>
                    <th className="px-5 py-3 font-medium">External ID</th>
                    <th className="px-5 py-3 font-medium">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => {
                    const expanded = expandedId === record.id
                    return (
                      <tr
                        key={record.id}
                        className="border-b border-gray-100 align-top hover:bg-gray-50/80"
                      >
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                          {formatTime(record.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {record.entity_type}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-gray-600">
                          {record.external_id ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : record.id)}
                            className="w-full text-left"
                          >
                            <code className="block max-w-xl truncate rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-700">
                              {payloadPreview(record.payload)}
                            </code>
                            <span className="mt-1 inline-block text-xs text-gray-500">
                              {expanded ? "Hide full payload" : "View full payload"}
                            </span>
                          </button>
                          {expanded && (
                            <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800">
                              {JSON.stringify(record.payload, null, 2)}
                            </pre>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Showing {offset + 1}–{Math.min(offset + records.length, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void loadRecords(Math.max(0, offset - PAGE_SIZE), entityFilter, true)}
                  disabled={offset === 0 || refreshing}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="flex items-center px-2 text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => void loadRecords(offset + PAGE_SIZE, entityFilter, true)}
                  disabled={offset + PAGE_SIZE >= total || refreshing}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </AdminShell>
  )
}
