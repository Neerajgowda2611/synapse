import type { JobFitBreakdown } from "@/lib/profiling/job-fit-types"

export interface CompetencyView {
  trait: string
  name: string
  score: number
  verified: boolean
  weight: number
  weightLabel: "High" | "Medium" | "Low"
  roleWeightPct: number
  matchPoints: number
  missing: boolean
  sourceIds: string[]
}

export interface RoleView {
  id: string
  title: string
  focus: string
  fitPercent: number
  competencies: CompetencyView[]
  fitBreakdown?: JobFitBreakdown
}

export interface PlayerCardViewData {
  roles: RoleView[]
  sourceLabels: Record<string, string>
}
