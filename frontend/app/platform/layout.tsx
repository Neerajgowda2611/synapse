import { ReactNode } from "react"

import { DashboardShell } from "@/components/layout/dashboard-shell"

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell surface="platform">
      {children}
    </DashboardShell>
  )
}
