import { Activity, CheckCircle2, Database, Plug } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DataSource } from "@/lib/api/data-sources"

type AdminOverviewKpisProps = {
  dataSources: DataSource[]
}

export function AdminOverviewKpis({ dataSources }: AdminOverviewKpisProps) {
  const activeCount = dataSources.filter((source) => source.status === "active").length
  const connectorTypes = new Set(
    dataSources.map((source) => source.connector_definition?.slug).filter(Boolean)
  ).size

  const items = [
    {
      label: "Connected sources",
      value: String(dataSources.length),
      hint: `${activeCount} active`,
      icon: Database,
    },
    {
      label: "Connector types",
      value: String(connectorTypes),
      hint: "Distinct integrations",
      icon: Plug,
    },
    {
      label: "Sync health",
      value: activeCount > 0 ? "Healthy" : "Pending",
      hint: activeCount > 0 ? "Latest imports succeeded" : "Run first discovery",
      icon: CheckCircle2,
    },
    {
      label: "Pipeline status",
      value: dataSources.length > 0 ? "Live" : "Idle",
      hint: dataSources.length > 0 ? "Ingestion configured" : "Add a connector",
      icon: Activity,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <item.icon className="size-4" />
              </div>
            </CardTitle>
            <CardDescription>{item.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-3xl font-medium leading-none tracking-tight tabular-nums">
                {item.value}
              </p>
              {item.label === "Sync health" && activeCount > 0 ? (
                <Badge variant="outline" className="font-normal">
                  OK
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
