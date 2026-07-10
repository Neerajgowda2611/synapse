import {
  DataSource,
  listDataSources,
  listRawRecords,
} from "@/lib/api/data-sources"
import { InstitutionUser, listInstitutionUsers } from "@/lib/api/institution-users"
import { listUserTraits } from "@/lib/api/profiler"

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

const NAME_KEYS = ["name", "full_name", "student_name", "std_nm", "learner_name"]
const EMAIL_KEYS = ["email", "student_email", "mail"]
const ID_KEYS = ["id", "student_id", "learner_id", "external_id", "roll_no"]

function readString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const match = Object.entries(payload).find(
      ([field]) => field.toLowerCase() === key || field.toLowerCase().includes(key)
    )
    if (match && typeof match[1] === "string" && match[1].trim()) {
      return match[1].trim()
    }
  }
  return undefined
}

function identityFromPayload(payload: Record<string, unknown>) {
  return {
    name: readString(payload, NAME_KEYS),
    email: readString(payload, EMAIL_KEYS),
    externalId: readString(payload, ID_KEYS),
  }
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

function mergeLearner(existing: LearnerRow, incoming: LearnerRow): LearnerRow {
  const status: LearnerRow["status"] =
    existing.status === "profiled" || incoming.status === "profiled"
      ? "profiled"
      : existing.status === "registered" || incoming.status === "registered"
        ? "registered"
        : "imported"

  return {
    ...existing,
    name: existing.name || incoming.name,
    email: existing.email || incoming.email,
    externalId: existing.externalId || incoming.externalId,
    userId: existing.userId || incoming.userId,
    sourceLabel: existing.sourceLabel || incoming.sourceLabel,
    status,
  }
}

async function learnersFromDataSources(sources: DataSource[]) {
  const byKey = new Map<string, LearnerRow>()

  await Promise.all(
    sources.map(async (source) => {
      try {
        const response = await listRawRecords(source.id, { limit: 80 })
        for (const record of response.data ?? []) {
          const identity = identityFromPayload(record.payload ?? {})
          const key =
            identity.email?.toLowerCase() ??
            identity.externalId ??
            `${source.id}:${record.external_id ?? record.id}`

          const row: LearnerRow = {
            id: key,
            name: identity.name ?? identity.externalId ?? "Imported learner",
            email: identity.email,
            externalId: identity.externalId ?? record.external_id,
            sourceLabel: source.name,
            status: "imported",
          }

          const existing = byKey.get(key)
          byKey.set(key, existing ? mergeLearner(existing, row) : row)
        }
      } catch {
        // Skip sources without readable records.
      }
    })
  )

  return Array.from(byKey.values())
}

async function enrichProfileMetrics(rows: LearnerRow[]) {
  const withUserId = rows.filter((row) => row.userId).slice(0, 12)

  const enrichedById = new Map<string, LearnerRow>()
  await Promise.all(
    withUserId.map(async (row) => {
      if (!row.userId) return
      try {
        const traits = await listUserTraits(row.userId)
        const data = traits.data ?? []
        const avg =
          data.length > 0
            ? Math.round(
                data.reduce((sum, trait) => sum + trait.value * 100, 0) / data.length
              )
            : 0
        enrichedById.set(row.id, {
          ...row,
          traitCount: data.length,
          profileStrength: avg,
          status: data.length > 0 ? "profiled" : row.status,
        })
      } catch {
        enrichedById.set(row.id, row)
      }
    })
  )

  return rows.map((row) => enrichedById.get(row.id) ?? row)
}

export async function loadAdminLearners(institutionId: string) {
  const [usersResult, sourcesResult] = await Promise.all([
    listInstitutionUsers(institutionId).catch(() => [] as InstitutionUser[]),
    listDataSources(institutionId),
  ])

  const sources = sourcesResult.data ?? []
  const learners = new Map<string, LearnerRow>()

  for (const user of usersResult) {
    if (user.role !== "learner") continue
    learners.set(user.user_id, learnerFromInstitutionUser(user))
  }

  const imported = await learnersFromDataSources(sources)
  for (const row of imported) {
    const key = row.email?.toLowerCase() ?? row.id
    const existing = learners.get(key)
    learners.set(key, existing ? mergeLearner(existing, row) : row)
  }

  const rows = Array.from(learners.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return enrichProfileMetrics(rows)
}
