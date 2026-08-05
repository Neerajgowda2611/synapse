"use client"

import { useEffect, useState } from "react"

import { AnalyticsKpis } from "@/components/admin/analytics/analytics-kpis"
import { LazyIngestionTrendChart } from "@/components/charts/lazy-charts"
import { LoadingState } from "@/components/admin/loading-state"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { loadAnalyticsSummary, type AnalyticsSummary } from "@/lib/admin/load-analytics"
import { syncStatusTextClass } from "@/lib/ui/status-tones"
import { cn } from "@/lib/utils"

function statusTone(status: string) {
  return syncStatusTextClass(status)
}

export default function AdminAnalyticsPage() {
  const { me, loading: authLoading } = useAdminAuth()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!me?.institution_id) {
      setLoading(false)
      return
    }

    loadAnalyticsSummary(me.institution_id)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [authLoading, me?.institution_id])

  if (authLoading || loading) {
    return <LoadingState label="Loading analytics..." />
  }

  if (!me?.institution_id) {
    return (
      <>
        <PageHeader
          title="Analytics"
          description="Institutional intelligence across ingestion, profiles, and learner engagement."
        />
        <div className="rounded-2xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          Your account is missing an institution assignment.
        </div>
      </>
    )
  }

  if (!summary) {
    return (
      <>
        <PageHeader
          title="Analytics"
          description="Institutional intelligence across ingestion, profiles, and learner engagement."
        />
        <div className="rounded-2xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          Could not load analytics summary.
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Institutional intelligence across ingestion, profiles, and learner engagement."
      />

      <div className="space-y-6">
        <AnalyticsKpis summary={summary} />

        <div className="grid gap-4 xl:grid-cols-2">
          <LazyIngestionTrendChart trend={summary.ingestionTrend} />

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-sm">Recent sync jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.recentJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sync jobs yet. Connect a data source and run schema discovery to begin.
                </p>
              ) : (
                summary.recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 text-sm last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{job.sourceName}</p>
                      <p className="text-muted-foreground">
                        {job.records_processed.toLocaleString()} records
                        {job.records_failed > 0 ? ` · ${job.records_failed} failed` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("capitalize", statusTone(job.status))}>{job.status}</span>
                      <Badge variant="outline" className="font-normal">
                        {new Date(job.completed_at ?? job.started_at ?? job.created_at).toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
