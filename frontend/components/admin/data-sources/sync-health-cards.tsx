"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { SyncJob } from "@/lib/api/data-sources"
import { getLatestSyncJob, listSyncJobs } from "@/lib/api/data-sources"
import { syncStatusTextClass } from "@/lib/ui/status-tones"
import { cn } from "@/lib/utils"

type SyncHealthCardsProps = {
  dataSourceId: string
  initialJob?: SyncJob | null
  onRefresh?: () => void
}

function formatDuration(started?: string, completed?: string) {
  if (!started) return "—"
  const start = new Date(started).getTime()
  const end = completed ? new Date(completed).getTime() : Date.now()
  const seconds = Math.max(0, Math.round((end - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function statusTone(status: string) {
  return syncStatusTextClass(status)
}

export function SyncHealthCards({
  dataSourceId,
  initialJob,
  onRefresh,
}: SyncHealthCardsProps) {
  const [latestJob, setLatestJob] = useState<SyncJob | null>(initialJob ?? null)
  const [recentJobs, setRecentJobs] = useState<SyncJob[]>([])
  const [loading, setLoading] = useState(!initialJob)
  const [refreshing, setRefreshing] = useState(false)

  async function loadJobs(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [latest, history] = await Promise.all([
        getLatestSyncJob(dataSourceId),
        listSyncJobs(dataSourceId, 5),
      ])
      setLatestJob(latest.data)
      setRecentJobs(history.data ?? [])
      onRefresh?.()
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!initialJob) void loadJobs()
  }, [dataSourceId])

  useEffect(() => {
    if (!latestJob || latestJob.status !== "running") return
    const timer = window.setInterval(() => void loadJobs(true), 4000)
    return () => window.clearInterval(timer)
  }, [latestJob?.id, latestJob?.status])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading sync status…
      </div>
    )
  }

  if (!latestJob) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No import jobs yet. Run schema discovery on the setup tab to start a database import.
        </CardContent>
      </Card>
    )
  }

  const kpis = [
    {
      title: "Latest status",
      value: latestJob.status,
      icon: latestJob.status === "completed" ? CheckCircle2 : latestJob.status === "failed" ? AlertCircle : Loader2,
      tone: statusTone(latestJob.status),
    },
    {
      title: "Records imported",
      value: String(latestJob.records_processed),
      icon: RefreshCw,
      tone: "text-foreground",
    },
    {
      title: "Failed records",
      value: String(latestJob.records_failed),
      icon: AlertCircle,
      tone: latestJob.records_failed > 0 ? "text-destructive" : "text-muted-foreground",
    },
    {
      title: "Duration",
      value: formatDuration(latestJob.started_at, latestJob.completed_at),
      icon: Clock,
      tone: "text-foreground",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Database import health and recent job history.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadJobs(true)}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <kpi.icon className={cn("size-4 shrink-0", kpi.tone)} aria-hidden />
              <span className={cn("text-2xl font-semibold capitalize tabular-nums", kpi.tone)}>
                {kpi.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {latestJob.error_message ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">{latestJob.error_message}</CardContent>
        </Card>
      ) : null}

      {recentJobs.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 text-sm last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium capitalize", statusTone(job.status))}>
                    {job.status}
                  </span>
                  <span className="text-muted-foreground">
                    {job.records_processed} records
                    {job.records_failed > 0 ? ` · ${job.records_failed} failed` : ""}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {job.completed_at
                    ? new Date(job.completed_at).toLocaleString()
                    : job.started_at
                      ? `Started ${new Date(job.started_at).toLocaleString()}`
                      : new Date(job.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
