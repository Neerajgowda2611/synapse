import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AnalyticsSummary } from "@/lib/admin/load-analytics"

type AnalyticsKpisProps = {
  summary: AnalyticsSummary
}

export function AnalyticsKpis({ summary }: AnalyticsKpisProps) {
  const items = [
    {
      label: "Connected sources",
      value: String(summary.connectedSources),
      hint: `${summary.activeSources} synced successfully`,
    },
    {
      label: "Records imported",
      value: summary.totalRecordsImported.toLocaleString(),
      hint:
        summary.totalFailedRecords > 0
          ? `${summary.totalFailedRecords.toLocaleString()} failed`
          : "Across latest sync jobs",
    },
    {
      label: "Learners tracked",
      value: String(summary.learnerCount),
      hint: `${summary.profiledLearners} with profiles`,
    },
    {
      label: "Avg profile strength",
      value: summary.avgProfileStrength > 0 ? `${summary.avgProfileStrength}%` : "—",
      hint: "From derived trait readings",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
