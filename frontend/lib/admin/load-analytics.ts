import {
  DataSource,
  SyncJob,
  getLatestSyncJob,
  listDataSources,
  listSyncJobs,
} from "@/lib/api/data-sources"
import { loadAdminLearners } from "@/lib/admin/load-learners"

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

function formatJobLabel(job: SyncJob) {
  const date = job.completed_at ?? job.started_at ?? job.created_at
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

async function loadSourceJobs(source: DataSource) {
  const [latestResult, historyResult] = await Promise.all([
    getLatestSyncJob(source.id).catch(() => ({ data: null as SyncJob | null })),
    listSyncJobs(source.id, 8).catch(() => ({ data: [] as SyncJob[] })),
  ])

  return {
    source,
    latest: latestResult.data,
    history: historyResult.data ?? [],
  }
}

export async function loadAnalyticsSummary(institutionId: string): Promise<AnalyticsSummary> {
  const [sourcesResult, learners] = await Promise.all([
    listDataSources(institutionId),
    loadAdminLearners(institutionId).catch(() => []),
  ])

  const sources = sourcesResult.data ?? []
  const sourceJobs = await Promise.all(sources.map(loadSourceJobs))

  let totalRecordsImported = 0
  let totalFailedRecords = 0
  let activeSources = 0
  const recentJobs: AnalyticsSummary["recentJobs"] = []
  const trendMap = new Map<string, { imported: number; failed: number }>()

  for (const { source, latest, history } of sourceJobs) {
    if (latest?.status === "completed") activeSources += 1
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

  const profiled = learners.filter((learner) => learner.status === "profiled")
  const strengths = profiled
    .map((learner) => learner.profileStrength ?? 0)
    .filter((value) => value > 0)
  const avgProfileStrength =
    strengths.length > 0
      ? Math.round(strengths.reduce((sum, value) => sum + value, 0) / strengths.length)
      : 0

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
    learnerCount: learners.length,
    profiledLearners: profiled.length,
    avgProfileStrength,
    recentJobs: recentJobs.slice(0, 8),
    ingestionTrend,
  }
}
