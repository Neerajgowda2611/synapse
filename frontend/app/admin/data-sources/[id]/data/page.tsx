"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { Alert } from "@/components/admin/alert"
import { DataSourceWorkspace } from "@/components/admin/data-sources/data-source-workspace"
import { SyncHealthCards } from "@/components/admin/data-sources/sync-health-cards"
import { LoadingState } from "@/components/admin/loading-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  EntityTypeCount,
  Observation,
  RawRecord,
  SourceEventTypeCount,
  getDataSource,
  listObservations,
  listRawRecords,
} from "@/lib/api/data-sources"
import { cn } from "@/lib/utils"

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
  const { loading: authLoading } = useAdminAuth()
  const [isWebhook, setIsWebhook] = useState(false)
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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (authLoading) return
    getDataSource(id)
      .then((ds) => {
        setIsWebhook(ds.connector_definition?.slug === "webhook")
        setReady(true)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load data source"))
  }, [authLoading, id])

  const loadData = useCallback(
    async (nextOffset: number, filter: string, silent = false) => {
      if (!ready) return
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
    [id, isWebhook, ready]
  )

  useEffect(() => {
    if (!ready) return
    const filter = isWebhook ? eventTypeFilter : entityFilter
    void loadData(0, filter)
  }, [ready, isWebhook, entityFilter, eventTypeFilter, loadData])

  const rowCount = isWebhook ? observations.length : records.length
  const activeFilter = isWebhook ? eventTypeFilter : entityFilter
  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const grandTotal = isWebhook
    ? byEventType.reduce((sum, item) => sum + item.count, 0)
    : byEntity.reduce((sum, item) => sum + item.count, 0)

  if (authLoading || !ready || (loading && rowCount === 0 && !error)) {
    return <LoadingState label="Loading collected data..." />
  }

  return (
    <DataSourceWorkspace
      dataSourceId={id}
      title="Collected data"
      description={
        grandTotal > 0
          ? isWebhook
            ? `${grandTotal} observations received from this webhook.`
            : `${grandTotal} raw records stored from this connector.`
          : isWebhook
            ? "Observations appear here after apps POST to your ingest URL."
            : "Records appear here after a database sync."
      }
      breadcrumbLabel="Data"
      activeSetupStep="data"
      action={
        <Button
          variant="outline"
          onClick={() => void loadData(offset, activeFilter, true)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      }
    >
      {error ? <Alert variant="error">{error}</Alert> : null}

      {!isWebhook ? <SyncHealthCards dataSourceId={id} /> : null}

      <FilterChips
        isWebhook={isWebhook}
        grandTotal={grandTotal}
        entityFilter={entityFilter}
        eventTypeFilter={eventTypeFilter}
        byEntity={byEntity}
        byEventType={byEventType}
        onEntityFilter={setEntityFilter}
        onEventTypeFilter={setEventTypeFilter}
      />

      <Card>
        <CardContent className="p-0">
          {rowCount === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium">{isWebhook ? "No observations yet" : "No records yet"}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {isWebhook
                  ? "POST an observation envelope to your ingest URL, then refresh."
                  : "Records appear once data is synced from the database."}
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => router.push(`/admin/data-sources/${id}`)}
              >
                Back to setup
              </Button>
            </div>
          ) : isWebhook ? (
            <>
              <DataTable
                headers={["Occurred", "Event type", "Source / ID", "Payload"]}
                rows={observations.map((obs) => {
                  const expanded = expandedId === obs.id
                  return (
                    <TableRow key={obs.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatTime(obs.occurred_at)}
                        <span className="block text-xs">received {formatTime(obs.received_at)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{obs.source_event_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {obs.source_connector} · {obs.source_id}
                      </TableCell>
                      <TableCell>
                        <PayloadCell
                          expanded={expanded}
                          payload={obs.payload}
                          onToggle={() => setExpandedId(expanded ? null : obs.id)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              />
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
              <DataTable
                headers={["Received", "Entity", "External ID", "Payload"]}
                rows={records.map((record) => {
                  const expanded = expandedId === record.id
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatTime(record.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.entity_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{record.external_id ?? "—"}</TableCell>
                      <TableCell>
                        <PayloadCell
                          expanded={expanded}
                          payload={record.payload}
                          onToggle={() => setExpandedId(expanded ? null : record.id)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              />
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
        </CardContent>
      </Card>
    </DataSourceWorkspace>
  )
}

function FilterChips({
  isWebhook,
  grandTotal,
  entityFilter,
  eventTypeFilter,
  byEntity,
  byEventType,
  onEntityFilter,
  onEventTypeFilter,
}: {
  isWebhook: boolean
  grandTotal: number
  entityFilter: string
  eventTypeFilter: string
  byEntity: EntityTypeCount[]
  byEventType: SourceEventTypeCount[]
  onEntityFilter: (value: string) => void
  onEventTypeFilter: (value: string) => void
}) {
  const items = isWebhook ? byEventType : byEntity
  if (items.length === 0) return null

  const active = isWebhook ? eventTypeFilter : entityFilter
  const setActive = isWebhook ? onEventTypeFilter : onEntityFilter

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-2 p-4">
        <FilterChip active={active === ""} onClick={() => setActive("")}>
          All ({grandTotal})
        </FilterChip>
        {isWebhook
          ? byEventType.map((item) => (
              <FilterChip
                key={item.source_event_type}
                active={eventTypeFilter === item.source_event_type}
                onClick={() => onEventTypeFilter(item.source_event_type)}
              >
                {item.source_event_type} ({item.count})
              </FilterChip>
            ))
          : byEntity.map((item) => (
              <FilterChip
                key={item.entity_type}
                active={entityFilter === item.entity_type}
                onClick={() => onEntityFilter(item.entity_type)}
              >
                {item.entity_type} ({item.count})
              </FilterChip>
            ))}
      </CardContent>
    </Card>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: ReactNode
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header}>{header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{rows}</TableBody>
    </Table>
  )
}

function PayloadCell({
  expanded,
  payload,
  onToggle,
}: {
  expanded: boolean
  payload: Record<string, unknown>
  onToggle: () => void
}) {
  return (
    <button type="button" onClick={onToggle} className="w-full text-left">
      <code className="block max-w-xl truncate rounded bg-muted px-2 py-1 font-mono text-xs">
        {payloadPreview(payload)}
      </code>
      <span className="mt-1 inline-block text-xs text-muted-foreground">
        {expanded ? "Hide full payload" : "View full payload"}
      </span>
      {expanded ? (
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs">
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </button>
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
    <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {offset + 1}–{Math.min(offset + rowCount, total)} of {total}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={offset === 0 || refreshing}>
          Previous
        </Button>
        <span className="flex items-center px-2 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={offset + rowCount >= total || refreshing}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
