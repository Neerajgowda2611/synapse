export interface CompetencyView {
  trait: string
  name: string
  score: number
  verified: boolean
  sourceIds: string[]
}

export interface RoleView {
  id: string
  title: string
  focus: string
  fitPercent: number
  competencies: CompetencyView[]
}

export interface PlayerCardViewData {
  roles: RoleView[]
  sourceLabels: Record<string, string>
}
