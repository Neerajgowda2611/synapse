"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ConnectorBadge } from "@/components/admin/connector-badge"
import { ConnectorIcon } from "@/components/admin/connector-icon"
import { LoadingState } from "@/components/admin/loading-state"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { DataSource, listDataSources } from "@/lib/api/data-sources"
import { getConnectorMeta } from "@/lib/connector-meta"

function StatusBadge({ status }: { status: string }) {
  const active = status === "active"
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const { me, loading: authLoading } = useAdminAuth()
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !me?.institution_id) return

    listDataSources(me.institution_id)
      .then((response) => setDataSources(response.data ?? []))
      .finally(() => setLoading(false))
  }, [authLoading, me?.institution_id])

  if (authLoading || loading) {
    return <LoadingState />
  }

  return (
    <>
      <PageHeader
        title="Data sources"
        description="Connect external systems and map incoming data to learner profile domains."
        action={
          <Button onClick={() => router.push("/admin/data-sources/new")}>
            Add data source
          </Button>
        }
      />
      {dataSources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <ConnectorIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-foreground">No connectors yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Start by choosing a connector type — PostgreSQL for database sync, or Webhook for
            event-driven ingestion from tools like n8n.
          </p>
          <Button className="mt-6" onClick={() => router.push("/admin/data-sources/new")}>
            Add your first data source
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {dataSources.map((ds) => {
            const slug = ds.connector_definition?.slug
            const meta = getConnectorMeta(slug)

            return (
              <button
                key={ds.id}
                onClick={() => router.push(`/admin/data-sources/${ds.id}`)}
                className={`group rounded-2xl border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${meta.accentBorder}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-xl border p-2.5 ${meta.accentBg} ${meta.accentBorder} ${meta.accent}`}>
                    <ConnectorIcon slug={slug} className="h-5 w-5" />
                  </div>
                  <StatusBadge status={ds.status} />
                </div>

                <h2 className="mt-4 text-base font-semibold text-foreground group-hover:text-muted-foreground">
                  {ds.name}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ConnectorBadge slug={slug} name={ds.connector_definition?.name} size="sm" />
                  <span className="text-xs text-muted-foreground">{meta.typeLabel}</span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">Configure credentials and map entities →</p>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
