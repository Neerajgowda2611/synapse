"use client"

import { WorkflowCanvas } from "@/components/admin/workflows/workflow-canvas"
import { PageHeader } from "@/components/layout/page-header"

export default function AdminWorkflowsPage() {
  return (
    <>
      <PageHeader
        title="Workflows"
        description="Design ingestion pipelines from source systems to learner profiles."
      />

      <WorkflowCanvas />
    </>
  )
}
