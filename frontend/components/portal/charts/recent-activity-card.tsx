"use client"

import { format, formatDistanceToNow } from "date-fns"
import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { StreamActivityEvent } from "@/lib/profiling/three-streams-types"
import { formatConnectorLabel } from "@/lib/profiling/mappers"

type RecentActivityCardProps = {
  activities: StreamActivityEvent[]
  title?: string
  onSelect?: (activity: StreamActivityEvent) => void
  streamLabelByConnector?: (connector: string) => string
}

function activityWhen(activity: StreamActivityEvent): { dateLabel: string; relative: string } {
  const raw = activity.received_at || activity.occurred_at
  const date = new Date(raw)
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) {
    return { dateLabel: "—", relative: "Unknown time" }
  }
  return {
    dateLabel: format(date, "MMM d"),
    relative: formatDistanceToNow(date, { addSuffix: true }),
  }
}

export function RecentActivityCard({
  activities,
  title = "Recent Activity",
  onSelect,
  streamLabelByConnector,
}: RecentActivityCardProps) {
  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardAction className="flex items-center gap-1 text-xs text-muted-foreground">
          Latest signals <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recent activity yet. Events from Placement, Projex, and Mentorship will show up here.
          </p>
        ) : (
          activities.map((activity) => {
            const { dateLabel, relative } = activityWhen(activity)
            const streamLabel =
              streamLabelByConnector?.(activity.connector) ??
              formatConnectorLabel(activity.connector)
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => onSelect?.(activity)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="size-11 shrink-0 overflow-hidden rounded-sm border bg-background">
                    <div className="grid h-1/3 place-items-center border-b bg-muted text-[10px] font-medium uppercase leading-none">
                      {dateLabel.split(" ")[0]}
                    </div>
                    <div className="grid h-2/3 place-items-center text-lg leading-none">
                      {dateLabel.split(" ")[1] ?? "—"}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="truncate text-sm font-medium leading-none">{activity.label}</div>
                    <div className="truncate text-xs leading-none text-muted-foreground">
                      {activity.detail || relative}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-medium">
                  {streamLabel}
                </Badge>
              </button>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
