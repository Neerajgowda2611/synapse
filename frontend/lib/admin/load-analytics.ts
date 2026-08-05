import {
  DataSource,
  SyncJob,
  listDataSources,
  listSyncJobs,
} from "@/lib/api/data-sources"
import { listInstitutionUsers } from "@/lib/api/institution-users"

export type AnalyticsSummary = {
  connectedSources: number
  activeSources: number
  totalRecordsImported: number
  totalFailedRecords: number
  learnerCount: number
  profiledLearners: number
  avgProfileStrength: number
  recentJobs: Array<SyncJob & { sourceName: string }>
  ingestionTrend: Array<{ label: string; imported: number; failed: number }>
}

/** Keep analytics off the N+1 path — a few recent sources is enough for overview charts. */
const SYNC_SAMPLE_LIMIT = 3
const SYNC_HISTORY_LIMIT = 5

function formatJobLabel(job: SyncJob) {
  const date = job.completed_at ?? job.started_at ?? job.created_at
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function pickSourcesForSyncSample(sources: DataSource[]) {
  return [...sources]
    .filter((source) => source.connector_definition?.slug !== "webhook")
    .sort((a, b) => {
      const aTime = a.last_sync_at ? new Date(a.last_sync_at).getTime() : 0
      const bTime = b.last_sync_at ? new Date(b.last_sync_at).getTime() : 0
      return bTime - aTime
    })
    .slice(0, SYNC_SAMPLE_LIMIT)
}

async function loadSourceHistory(source: DataSource) {
  const historyResult = await listSyncJobs(source.id, SYNC_HISTORY_LIMIT).catch(() => ({
    data: [] as SyncJob[],
  }))
  return {
    source,
    history: historyResult.data ?? [],
  }
}

export async function loadAnalyticsSummary(institutionId: string): Promise<AnalyticsSummary> {
  const [sourcesResult, users] = await Promise.all([
    listDataSources(institutionId),
    listInstitutionUsers(institutionId).catch(() => []),
  ])

  const sources = sourcesResult.data ?? []
  const learnerCount = users.filter((user) => user.role === "learner").length
  const activeSources = sources.filter((source) => source.status === "active").length

  const sample = pickSourcesForSyncSample(sources)
  const sourceJobs = sample.length > 0 ? await Promise.all(sample.map(loadSourceHistory)) : []

  let totalRecordsImported = 0
  let totalFailedRecords = 0
  const recentJobs: AnalyticsSummary["recentJobs"] = []
  const trendMap = new Map<string, { imported: number; failed: number }>()

  for (const { source, history } of sourceJobs) {
    const latest = history[0]
    if (latest) {
      totalRecordsImported += latest.records_processed
      totalFailedRecords += latest.records_failed
      recentJobs.push({ ...latest, sourceName: source.name })
    }

    for (const job of history) {
      const label = formatJobLabel(job)
      const current = trendMap.get(label) ?? { imported: 0, failed: 0 }
      trendMap.set(label, {
        imported: current.imported + job.records_processed,
        failed: current.failed + job.records_failed,
      })
    }
  }

  const ingestionTrend = Array.from(trendMap.entries())
    .map(([label, values]) => ({ label, ...values }))
    .slice(-6)

  recentJobs.sort((a, b) => {
    const aTime = new Date(a.completed_at ?? a.started_at ?? a.created_at).getTime()
    const bTime = new Date(b.completed_at ?? b.started_at ?? b.created_at).getTime()
    return bTime - aTime
  })

  return {
    connectedSources: sources.length,
    activeSources,
    totalRecordsImported,
    totalFailedRecords,
    learnerCount,
    profiledLearners: 0,
    avgProfileStrength: 0,
    recentJobs: recentJobs.slice(0, 8),
    ingestionTrend,
  }
}
