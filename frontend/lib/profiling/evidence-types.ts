export interface EvidenceStat {
  label: string
}

export interface EvidenceItem {
  id: string
  text: string
  detail?: string
  occurred_at?: string
}

export interface EvidenceGroup {
  group_id: string
  title: string
  label: string
  count: number
  items: EvidenceItem[]
}

export interface EvidenceSource {
  source_id: string
  title: string
  stats: EvidenceStat[]
  groups: EvidenceGroup[]
  default_open: boolean
}

export interface CompetencyEvidence {
  description: string
  sources: EvidenceSource[]
}

export type CompetencyEvidenceMap = Record<string, Record<string, CompetencyEvidence>>
