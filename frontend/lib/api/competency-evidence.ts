import competencyEvidence from "@/data/competency-evidence.json"
import type { CompetencyEvidence, CompetencyEvidenceMap } from "@/lib/profiling/evidence-types"

export async function getCompetencyEvidenceMap(): Promise<CompetencyEvidenceMap> {
  return competencyEvidence as CompetencyEvidenceMap
}

export async function getCompetencyEvidence(
  roleId: string,
  competencyId: string
): Promise<CompetencyEvidence | null> {
  const map = await getCompetencyEvidenceMap()
  return map[roleId]?.[competencyId] ?? null
}
