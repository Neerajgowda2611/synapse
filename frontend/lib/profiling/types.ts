export interface DataSource {
  id: string
  label: string
}

export interface ProfileVerification {
  verified: boolean
  source_labels: string[]
}

export interface PlayerCardProfile {
  institution: string
  degree: string
  academic_year: string
  verification: ProfileVerification
}

export interface Competency {
  id: string
  name: string
  score: number
  verified: boolean
  source_ids: string[]
  evidence_url: string | null
}

export interface WeightedOperand {
  competency_id: string
  weight: number
}

export interface WeightedAverageFormula {
  type: "weighted_average"
  operands: WeightedOperand[]
}

export interface AverageFormula {
  type: "average"
  competency_ids: string[]
}

export type RoleFitFormula = WeightedAverageFormula | AverageFormula

export interface Role {
  id: string
  title: string
  focus: string
  role_fit_formula: RoleFitFormula
  competencies: Competency[]
}

export interface PlayerCardResponse {
  profile: PlayerCardProfile
  data_sources: DataSource[]
  roles: Role[]
}
