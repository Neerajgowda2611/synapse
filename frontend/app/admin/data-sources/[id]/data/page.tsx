"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Alert } from "@/components/admin/alert"
import { ConnectorBadge } from "@/components/admin/connector-badge"
import { LoadingState } from "@/components/admin/loading-state"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  DataSource,
  EntityTypeCount,
  Observation,
  RawRecord,
  SourceEventTypeCount,
  SyncJob,
  getDataSource,
  getLatestSyncJob,
  listObservations,
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
  const [observations, setObservations] = useState<Observation[]>([])
  const [byEntity, setByEntity] = useState<EntityTypeCount[]>([])
  const [byEventType, setByEventType] = useState<SourceEventTypeCount[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [entityFilter, setEntityFilter] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncJob, setSyncJob] = useState<SyncJob | null>(null)

  const isWebhook = dataSource?.connector_definition?.slug === "webhook"

  const loadData = useCallback(
    async (nextOffset: number, filter: string, silent = false) => {
      if (!dataSource) return
      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError("")

      try {
        if (isWebhook) {
          const response = await listObservations(id, {
            limit: PAGE_SIZE,
            offset: nextOffset,
            source_event_type: filter || undefined,
          })
          setObservations(response.data ?? [])
          setByEventType(response.by_source_event_type ?? [])
          setTotal(response.total ?? 0)
        } else {
          const response = await listRawRecords(id, {
            limit: PAGE_SIZE,
            offset: nextOffset,
            entity_type: filter || undefined,
          })
          setRecords(response.data ?? [])
          setByEntity(response.by_entity_type ?? [])
          setTotal(response.total ?? 0)
        }
        setOffset(nextOffset)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [dataSource, id, isWebhook]
  )

  useEffect(() => {
    if (authLoading) return
    getDataSource(id)
      .then(setDataSource)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load data source"))
  }, [authLoading, id])

  useEffect(() => {
    if (authLoading || !dataSource) return
    const filter = isWebhook ? eventTypeFilter : entityFilter
    void loadData(0, filter)
  }, [authLoading, dataSource, isWebhook, entityFilter, eventTypeFilter, loadData])

  const loadSyncJob = useCallback(async () => {
    if (isWebhook) return
    try {
      const response = await getLatestSyncJob(id)
      setSyncJob(response.data)
    } catch {
      // ignore
    }
  }, [id, isWebhook])

  useEffect(() => {
    if (authLoading || isWebhook) return
    void loadSyncJob()
  }, [authLoading, isWebhook, loadSyncJob])

  useEffect(() => {
    if (!syncJob || syncJob.status !== "running") return
    const timer = window.setInterval(() => {
      void loadSyncJob()
      void loadData(offset, entityFilter, true)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [syncJob, offset, entityFilter, loadSyncJob, loadData])

  const rowCount = isWebhook ? observations.length : records.length
  const activeFilter = isWebhook ? eventTypeFilter : entityFilter

  if (authLoading || !dataSource || (loading && rowCount === 0 && !error)) {
    return <LoadingState />
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const grandTotal = isWebhook
    ? byEventType.reduce((sum, item) => sum + item.count, 0)
    : byEntity.reduce((sum, item) => sum + item.count, 0)

  return (
    <>
      <PageHeader
        title="Collected data"
        description={
          grandTotal > 0
            ? isWebhook
              ? `${grandTotal} ${grandTotal === 1 ? "observation" : "observations"} received from this webhook.`
              : `${grandTotal} raw ${grandTotal === 1 ? "record" : "records"} stored from this connector.`
            : isWebhook
              ? "Observations appear here after apps POST to your ingest URL."
              : "Records appear here after a database sync."
        }
        breadcrumbs={[
          { label: "Data sources", href: "/admin" },
          { label: dataSource.name, href: `/admin/data-sources/${id}` },
          { label: "Collected data" },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {dataSource.connector_definition && (
              <ConnectorBadge
                slug={dataSource.connector_definition.slug}
                name={dataSource.connector_definition.name}
              />
            )}
            <button
              onClick={() => {
                void loadData(offset, activeFilter, true)
                void loadSyncJob()
              }}
              disabled={refreshing}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        }
      />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {!isWebhook && syncJob && (
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Latest import</h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                syncJob.status === "completed"
                  ? "bg-emerald-50 text-emerald-700"
                  : syncJob.status === "running"
                    ? "bg-blue-50 text-blue-700"
                    : syncJob.status === "failed"
                      ? "bg-red-50 text-red-700"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {syncJob.status}
            </span>
            <span>{syncJob.records_processed} records imported</span>
            {syncJob.records_failed > 0 && <span>{syncJob.records_failed} failed</span>}
            {syncJob.error_message && (
              <span className="text-red-600">{syncJob.error_message}</span>
            )}
          </div>
        </section>
      )}

      {isWebhook && byEventType.length > 0 && (
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">By event type</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setEventTypeFilter("")}
              className={`rounded-full border px-3 py-1 text-sm ${
                eventTypeFilter === ""
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              All ({grandTotal})
            </button>
            {byEventType.map((item) => (
              <button
                key={item.source_event_type}
                onClick={() => setEventTypeFilter(item.source_event_type)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  eventTypeFilter === item.source_event_type
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.source_event_type} ({item.count})
              </button>
            ))}
          </div>
        </section>
      )}

      {!isWebhook && byEntity.length > 0 && (
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
        {rowCount === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-gray-900">
              {isWebhook ? "No observations yet" : "No records yet"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {isWebhook
                ? "POST an observation envelope to your ingest URL, then refresh this page."
                : "Records will appear here once data is synced from the database."}
            </p>
            <button
              onClick={() => router.push(`/admin/data-sources/${id}`)}
              className="mt-6 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to setup
            </button>
          </div>
        ) : isWebhook ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-medium">Occurred</th>
                    <th className="px-5 py-3 font-medium">Event type</th>
                    <th className="px-5 py-3 font-medium">Source / ID</th>
                    <th className="px-5 py-3 font-medium">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {observations.map((obs) => {
                    const expanded = expandedId === obs.id
                    return (
                      <tr
                        key={obs.id}
                        className="border-b border-gray-100 align-top hover:bg-gray-50/80"
                      >
                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                          {formatTime(obs.occurred_at)}
                          <span className="block text-xs text-gray-400">
                            received {formatTime(obs.received_at)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {obs.source_event_type}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-gray-600">
                          {obs.source_connector} · {obs.source_id}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : obs.id)}
                            className="w-full text-left"
                          >
                            <code className="block max-w-xl truncate rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-700">
                              {payloadPreview(obs.payload)}
                            </code>
                            <span className="mt-1 inline-block text-xs text-gray-500">
                              {expanded ? "Hide full payload" : "View full payload"}
                            </span>
                          </button>
                          {expanded && (
                            <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800">
                              {JSON.stringify(obs.payload, null, 2)}
                            </pre>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              offset={offset}
              rowCount={observations.length}
              total={total}
              page={page}
              totalPages={totalPages}
              refreshing={refreshing}
              onPrev={() => void loadData(Math.max(0, offset - PAGE_SIZE), eventTypeFilter, true)}
              onNext={() => void loadData(offset + PAGE_SIZE, eventTypeFilter, true)}
            />
          </>
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
            <Pagination
              offset={offset}
              rowCount={records.length}
              total={total}
              page={page}
              totalPages={totalPages}
              refreshing={refreshing}
              onPrev={() => void loadData(Math.max(0, offset - PAGE_SIZE), entityFilter, true)}
              onNext={() => void loadData(offset + PAGE_SIZE, entityFilter, true)}
            />
          </>
        )}
      </section>
    </>
  )
}

function Pagination({
  offset,
  rowCount,
  total,
  page,
  totalPages,
  refreshing,
  onPrev,
  onNext,
}: {
  offset: number
  rowCount: number
  total: number
  page: number
  totalPages: number
  refreshing: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500">
        Showing {offset + 1}–{Math.min(offset + rowCount, total)} of {total}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={offset === 0 || refreshing}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="flex items-center px-2 text-sm text-gray-500">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={offset + rowCount >= total || refreshing}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
