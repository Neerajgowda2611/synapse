"use client"

import { useParams } from "next/navigation"

import { DataSourceWorkspace } from "@/components/admin/data-sources/data-source-workspace"
import { SyncHealthCards } from "@/components/admin/data-sources/sync-health-cards"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { LoadingState } from "@/components/admin/loading-state"

export default function SyncHealthPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { loading: authLoading } = useAdminAuth()

  if (authLoading) {
    return <LoadingState />
  }

  return (
    <DataSourceWorkspace
      dataSourceId={id}
      title="Sync health"
      description="Monitor database import jobs, throughput, and failures."
      breadcrumbLabel="Sync health"
      showSetupSteps={false}
    >
      <SyncHealthCards dataSourceId={id} />
    </DataSourceWorkspace>
  )
}
