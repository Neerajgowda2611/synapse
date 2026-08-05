"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { AdminOverviewKpis } from "@/components/admin/overview/admin-overview-kpis"
import { DataSourceOverviewCard } from "@/components/admin/overview/data-source-overview-card"
import { ConnectorIcon } from "@/components/admin/connector-icon"
import { LoadingState } from "@/components/admin/loading-state"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { DataSource, listDataSources } from "@/lib/api/data-sources"

export default function AdminPage() {
  const router = useRouter()
  const { me, loading: authLoading } = useAdminAuth()
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!me?.institution_id) {
      setLoading(false)
      return
    }

    listDataSources(me.institution_id)
      .then((response) => setDataSources(response.data ?? []))
      .catch(() => setDataSources([]))
      .finally(() => setLoading(false))
  }, [authLoading, me?.institution_id])

  if (authLoading || loading) {
    return <LoadingState />
  }

  if (!me?.institution_id) {
    return (
      <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
        <h3 className="text-lg font-medium">Institution not linked</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Your institution admin account is missing an institution assignment. Ask a platform
          admin to attach your role to an institution, then sign in again.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Monitor connectors, ingestion health, and jump into setup for each data source."
        action={
          <Button onClick={() => router.push("/admin/data-sources/new")}>
            <Plus className="size-4" />
            Add data source
          </Button>
        }
      />

      <AdminOverviewKpis dataSources={dataSources} />

      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Data sources</h2>
            <p className="text-sm text-muted-foreground">
              Connectors configured for your institution.
            </p>
          </div>
        </div>

        {dataSources.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <ConnectorIcon className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No connectors yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Start with PostgreSQL for database sync or Webhook for event-driven ingestion.
            </p>
            <Button className="mt-6" onClick={() => router.push("/admin/data-sources/new")}>
              Add your first data source
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dataSources.map((dataSource) => (
              <DataSourceOverviewCard key={dataSource.id} dataSource={dataSource} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
