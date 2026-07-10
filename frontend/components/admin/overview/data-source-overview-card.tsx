import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { ConnectorBadge } from "@/components/admin/connector-badge"
import { ConnectorIcon } from "@/components/admin/connector-icon"
import { DataSourceStatusBadge } from "@/components/admin/data-sources/data-source-status-badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DataSource } from "@/lib/api/data-sources"
import { getConnectorMeta } from "@/lib/connector-meta"

type DataSourceOverviewCardProps = {
  dataSource: DataSource
}

export function DataSourceOverviewCard({ dataSource }: DataSourceOverviewCardProps) {
  const slug = dataSource.connector_definition?.slug
  const meta = getConnectorMeta(slug)

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>
          <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <ConnectorIcon slug={slug} />
          </div>
        </CardTitle>
        <CardDescription className="line-clamp-1">{meta.typeLabel}</CardDescription>
        <CardAction className="flex items-center gap-2">
          <DataSourceStatusBadge status={dataSource.status} />
          <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Link
            href={`/admin/data-sources/${dataSource.id}`}
            className="text-base font-semibold tracking-tight hover:text-muted-foreground"
          >
            {dataSource.name}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConnectorBadge slug={slug} name={dataSource.connector_definition?.name} size="sm" />
        </div>
        <p className="text-xs text-muted-foreground">
          {dataSource.last_sync_at
            ? `Last sync ${new Date(dataSource.last_sync_at).toLocaleString()}`
            : "No sync recorded yet"}
        </p>
      </CardContent>
    </Card>
  )
}
