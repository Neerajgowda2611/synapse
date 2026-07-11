"use client"

import { Briefcase, MessagesSquare, Rocket, type LucideIcon } from "lucide-react"

import { PortalPageHeader } from "@/components/portal/portal-page-header"
import { ProgressRing } from "@/components/portal/progress-ring"
import { LazyStreamActivityChart } from "@/components/charts/lazy-charts"
import {
  UpcomingActivitiesCard,
  type UpcomingActivity,
} from "@/components/portal/charts/upcoming-activities-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { chartColorVar } from "@/lib/themes/chart-colors"
import type { Stream, StreamIcon, ThreeStreamsResponse } from "@/lib/profiling/three-streams-types"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<StreamIcon, LucideIcon> = {
  briefcase: Briefcase,
  rocket: Rocket,
  "messages-square": MessagesSquare,
}

const STREAM_CHART_INDEX: Record<string, 1 | 2 | 3 | 4> = {
  vtu: 1,
  projex: 2,
  mentorship: 3,
}

const STREAM_BORDER_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "border-t-chart-1",
  2: "border-t-chart-2",
  3: "border-t-chart-3",
  4: "border-t-chart-4",
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

function streamProgress(stream: Stream) {
  const highlights = stream.recent_highlights?.length ?? 0
  const total = highlights + (stream.contributes?.length ?? 0) + (stream.activities_we_consider?.length ?? 0)
  if (total === 0) return 0
  return Math.min(100, Math.round((highlights / total) * 100) || (highlights > 0 ? 24 : 0))
}

function StreamCourseCard({ stream }: { stream: Stream }) {
  const Icon = ICON_MAP[stream.icon] ?? Briefcase
  const highlights = stream.recent_highlights ?? []
  const highlightCount = highlights.length
  const contributes = stream.contributes ?? []
  const progress = streamProgress(stream)

  const chartIndex = STREAM_CHART_INDEX[stream.id] ?? 4

  return (
    <Card className={cn("min-w-0 border-t-4", STREAM_BORDER_CLASS[chartIndex])}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border bg-muted/50">
              <Icon className="size-5 text-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">{stream.label}</CardTitle>
              <p className="truncate text-xs text-muted-foreground">{stream.subtitle}</p>
            </div>
          </div>
          <ProgressRing value={progress} size={48} strokeWidth={4} indicatorChart={chartIndex}>
            <span className="text-[10px] font-semibold tabular-nums">{highlightCount}</span>
          </ProgressRing>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Signal activity</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(progress, highlightCount > 0 ? 8 : 0)}%`,
                backgroundColor: chartColorVar(chartIndex - 1),
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {contributes.slice(0, 3).map((item) => (
            <Badge key={item} variant="outline" className="max-w-full truncate text-[10px]">
              {item}
            </Badge>
          ))}
        </div>
        {highlights[0] ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            Latest: {highlights[0]}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No highlights yet — activities will appear here.</p>
        )}
      </CardContent>
      <CardFooter className="border-t border-border/60 py-3 text-xs text-muted-foreground">
        {highlights.length} recent highlight{highlights.length === 1 ? "" : "s"}
      </CardFooter>
    </Card>
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
              <CardTitle className="text-sm">{stream.label} signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  What activities show
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {whatActivitiesShow.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
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
                  <ul className="space-y-2 text-sm">
                    {highlights.map((item) => (
                      <li key={item} className="rounded-lg border bg-muted/30 px-3 py-2 wrap-break-word">
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
      <PortalPageHeader
        title={data.title}
        description="Your academic, professional, and personal growth streams in one analytical view."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {streams.map((stream) => (
          <StreamCourseCard key={stream.id} stream={stream} />
        ))}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <LazyStreamActivityChart streams={streams} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <UpcomingActivitiesCard activities={upcomingActivities} />
        </div>
      </div>

      <StreamInsightsGrid streams={streams} />
    </div>
  )
}
