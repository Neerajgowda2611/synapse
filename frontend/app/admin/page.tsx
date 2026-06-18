"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminShell } from "@/components/admin/admin-shell"
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
    <AdminShell
      email={me?.email}
      title="Data sources"
      description="Connect external systems and map incoming data to learner profile domains."
      action={
        <button
          onClick={() => router.push("/admin/data-sources/new")}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Add data source
        </button>
      }
    >
      {dataSources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <ConnectorIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">No connectors yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Start by choosing a connector type — PostgreSQL for database sync, or Webhook for
            event-driven ingestion from tools like n8n.
          </p>
          <button
            onClick={() => router.push("/admin/data-sources/new")}
            className="mt-6 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add your first data source
          </button>
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
                className={`group rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${meta.accentBorder}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-xl border p-2.5 ${meta.accentBg} ${meta.accentBorder} ${meta.accent}`}>
                    <ConnectorIcon slug={slug} className="h-5 w-5" />
                  </div>
                  <StatusBadge status={ds.status} />
                </div>

                <h2 className="mt-4 text-base font-semibold text-gray-900 group-hover:text-gray-700">
                  {ds.name}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ConnectorBadge slug={slug} name={ds.connector_definition?.name} size="sm" />
                  <span className="text-xs text-gray-400">{meta.typeLabel}</span>
                </div>

                <p className="mt-3 text-sm text-gray-500">Configure credentials and map entities →</p>
              </button>
            )
          })}
        </div>
      )}
    </AdminShell>
  )
}
