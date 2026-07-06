export interface EvidenceStat {
  label: string
}

export interface EvidenceItem {
  text: string
  tag: string
}

export interface EvidenceSource {
  source_id: string
  title: string
  stats: EvidenceStat[]
  items: EvidenceItem[]
  default_open: boolean
}

export interface CompetencyEvidence {
  description: string
  sources: EvidenceSource[]
}

export type CompetencyEvidenceMap = Record<string, Record<string, CompetencyEvidence>>
