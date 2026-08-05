import { InstitutionUser, listInstitutionUsers } from "@/lib/api/institution-users"

export type LearnerRow = {
  id: string
  userId?: string
  name: string
  email?: string
  externalId?: string
  sourceLabel?: string
  status: "profiled" | "imported" | "registered"
  traitCount?: number
  profileStrength?: number
}

function learnerFromInstitutionUser(user: InstitutionUser): LearnerRow {
  return {
    id: user.user_id,
    userId: user.user_id,
    name: user.name,
    email: user.email,
    status: "registered",
    sourceLabel: "Institution account",
  }
}

/**
 * Lists learners for an institution.
 *
 * Uses provisioned institution users only. Do not scrape raw_records across every
 * data source here — that caused an N+1 storm (one /records call per connector).
 * Trait details are loaded on demand in the profile preview sheet.
 */
export async function loadAdminLearners(institutionId: string) {
  const users = await listInstitutionUsers(institutionId).catch(() => [] as InstitutionUser[])

  return users
    .filter((user) => user.role === "learner")
    .map(learnerFromInstitutionUser)
    .sort((a, b) => a.name.localeCompare(b.name))
}
