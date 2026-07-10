"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"

import { Alert } from "@/components/admin/alert"
import { ConnectorSummary } from "@/components/admin/data-sources/connector-summary"
import { DataSourceTabs } from "@/components/admin/data-sources/data-source-tabs"
import { useDataSourceProgress } from "@/components/admin/data-sources/use-data-source-progress"
import { LoadingState } from "@/components/admin/loading-state"
import { SetupSteps } from "@/components/admin/setup-steps"
import { PageHeader } from "@/components/layout/page-header"
import { buildSetupSteps, setupStepHref, type SetupStepId } from "@/lib/admin/setup-steps"

type DataSourceWorkspaceProps = {
  dataSourceId: string
  title: string
  description: string
  breadcrumbLabel: string
  activeSetupStep?: SetupStepId
  showSetupSteps?: boolean
  onSetupStepClick?: (stepId: SetupStepId) => void
  action?: ReactNode
  children: ReactNode
}

export function DataSourceWorkspace({
  dataSourceId,
  title,
  description,
  breadcrumbLabel,
  activeSetupStep,
  showSetupSteps = true,
  onSetupStepClick,
  action,
  children,
}: DataSourceWorkspaceProps) {
  const router = useRouter()
  const { dataSource, progress, loading, error } = useDataSourceProgress(dataSourceId)

  if (loading) {
    return <LoadingState label="Loading data source..." />
  }

  if (error || !dataSource) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error ?? "Data source not found."}</Alert>
      </div>
    )
  }

  const isWebhook = dataSource.connector_definition?.slug === "webhook"
  const setupSteps = buildSetupSteps(isWebhook, progress, activeSetupStep)

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Data sources", href: "/admin" },
          { label: dataSource.name, href: `/admin/data-sources/${dataSourceId}` },
          { label: breadcrumbLabel },
        ]}
        action={action}
      />

      <div className="flex flex-col gap-6">
        <ConnectorSummary dataSource={dataSource} />
        <DataSourceTabs dataSourceId={dataSourceId} isWebhook={isWebhook} />

        {showSetupSteps ? (
          <SetupSteps
            steps={setupSteps}
            activeStepId={activeSetupStep ?? setupSteps.find((s) => s.status === "current")?.id ?? "credentials"}
            onStepClick={(stepId) => {
              const typed = stepId as SetupStepId
              if (onSetupStepClick) {
                onSetupStepClick(typed)
                return
              }
              router.push(setupStepHref(dataSourceId, typed))
            }}
          />
        ) : null}

        {children}
      </div>
    </>
  )
}
