"use client"

import { Briefcase, MessagesSquare, Rocket, type LucideIcon } from "lucide-react"

import { StreamActivityChart } from "@/components/portal/charts/stream-activity-chart"
import {
  UpcomingActivitiesCard,
  type UpcomingActivity,
} from "@/components/portal/charts/upcoming-activities-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Stream, StreamIcon, ThreeStreamsResponse } from "@/lib/profiling/three-streams-types"

const ICON_MAP: Record<StreamIcon, LucideIcon> = {
  briefcase: Briefcase,
  rocket: Rocket,
  "messages-square": MessagesSquare,
}

type ThreeStreamsViewProps = {
  data: ThreeStreamsResponse
}

function buildUpcomingActivities(streams: Stream[]): UpcomingActivity[] {
  const activities: UpcomingActivity[] = []

  streams.forEach((stream, streamIndex) => {
    const highlights = stream.recent_highlights ?? []
    highlights.slice(0, 2).forEach((highlight, index) => {
      activities.push({
        id: `${stream.id}-${index}`,
        title: highlight,
        time: `${stream.label} stream`,
        type: stream.label,
        dayOffset: streamIndex * 3 + index + 2,
      })
    })
  })

  return activities.slice(0, 5)
}

function StreamSummaryCards({ streams }: { streams: Stream[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {streams.map((stream) => {
        const Icon = ICON_MAP[stream.icon] ?? Briefcase
        const highlights = stream.recent_highlights ?? []
        const contributes = stream.contributes ?? []
        const signalCount = highlights.length + contributes.length

        return (
          <Card key={stream.id} className="min-w-0">
            <CardHeader>
              <CardTitle className="text-sm">{stream.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-md border bg-muted">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl leading-none tracking-tight tabular-nums">{signalCount}</p>
                  <p className="truncate text-xs text-muted-foreground">{stream.subtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {contributes.slice(0, 3).map((item) => (
                  <Badge key={item} variant="outline" className="max-w-full truncate rounded-md text-[10px]">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}

function StreamInsightsGrid({ streams }: { streams: Stream[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {streams.map((stream) => {
        const whatActivitiesShow = stream.what_activities_show ?? []
        const highlights = stream.recent_highlights ?? []

        return (
          <Card key={stream.id} className="min-w-0">
            <CardHeader>
              <CardTitle className="text-sm">{stream.label} Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  What activities show
                </p>
                <ul className="space-y-1.5 text-sm">
                  {whatActivitiesShow.slice(0, 3).map((item) => (
                    <li key={item} className="text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Recent highlights
                </p>
                {highlights.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent highlights yet.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {highlights.map((item) => (
                      <li key={item} className="break-words">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export function ThreeStreamsView({ data }: ThreeStreamsViewProps) {
  const streams = data.streams ?? []
  const upcomingActivities = buildUpcomingActivities(streams)

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight sm:text-3xl">{data.title}</h1>
        <p className="text-sm text-muted-foreground">
          Your academic, professional, and personal growth streams in one analytical view.
        </p>
      </div>

      <StreamSummaryCards streams={streams} />

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <StreamActivityChart streams={streams} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <UpcomingActivitiesCard activities={upcomingActivities} />
        </div>
      </div>

      <StreamInsightsGrid streams={streams} />
    </div>
  )
}
