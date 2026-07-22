import { Suspense } from "react"

import { AuthLoadingState } from "@/components/auth/auth-page-state"
import { ProjectFitView } from "@/components/project-fit/project-fit-view"

export default function ProjectFitPage() {
  return (
    <Suspense fallback={<AuthLoadingState title="Loading project fit" />}>
      <ProjectFitView />
    </Suspense>
  )
}
