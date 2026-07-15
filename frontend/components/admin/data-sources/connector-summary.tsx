import { Activity, Clock3, Database } from "lucide-react"

import { ConnectorBadge } from "@/components/admin/connector-badge"
import { ConnectorIcon } from "@/components/admin/connector-icon"
import { DataSourceStatusBadge } from "@/components/admin/data-sources/data-source-status-badge"
import { Card, CardContent } from "@/components/ui/card"
import type { DataSource } from "@/lib/api/data-sources"
import { getConnectorMeta } from "@/lib/connector-meta"

type ConnectorSummaryProps = {
  dataSource: DataSource
}

export function ConnectorSummary({ dataSource }: ConnectorSummaryProps) {
  const slug = dataSource.connector_definition?.slug
  const meta = getConnectorMeta(slug)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`grid size-12 shrink-0 place-items-center rounded-xl border ${meta.accentBg} ${meta.accentBorder}`}
          >
            <ConnectorIcon slug={slug} className={`size-5 ${meta.accent}`} />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{dataSource.name}</h2>
              <DataSourceStatusBadge status={dataSource.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <ConnectorBadge slug={slug} name={dataSource.connector_definition?.name} size="sm" />
              <span>{meta.typeLabel}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 sm:gap-6">
          <SummaryStat
            icon={Database}
            label="Connector"
            value={dataSource.connector_definition?.name ?? "—"}
          />
          <SummaryStat
            icon={Activity}
            label="Status"
            value={dataSource.status}
          />
          <SummaryStat
            icon={Clock3}
            label="Last sync"
            value={
              dataSource.last_sync_at
                ? new Date(dataSource.last_sync_at).toLocaleString()
                : "Not synced yet"
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium capitalize">{value}</p>
      </div>
    </div>
  )
}
