export interface JobFitTraitBreakdown {
  trait: string
  name: string
  weight: number
  weight_label: "High" | "Medium" | "Low"
  role_weight_pct: number
  your_score: number
  contribution: number
  match_points: number
  missing: boolean
  usable: boolean
}

export interface JobFitBreakdown {
  fit_percent: number
  raw_score: number
  weight_sum: number
  summary: string
  missing_traits: string[]
  traits: JobFitTraitBreakdown[]
}
