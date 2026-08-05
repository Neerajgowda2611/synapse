"use client"

import { useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { Briefcase, ChevronRight, MessagesSquare, Rocket, type LucideIcon } from "lucide-react"

import { PortalPageHeader } from "@/components/portal/portal-page-header"
import { ProgressRing } from "@/components/portal/progress-ring"
import { CompetencyEvidenceDialog } from "@/components/portal/competency-evidence-dialog"
import { LazyStreamActivityChart } from "@/components/charts/lazy-charts"
import { RecentActivityCard } from "@/components/portal/charts/recent-activity-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { chartColorVar } from "@/lib/themes/chart-colors"
import { formatConnectorLabel } from "@/lib/profiling/mappers"
import type {
  Stream,
  StreamActivityEvent,
  StreamIcon,
  StreamTraitLink,
  ThreeStreamsResponse,
} from "@/lib/profiling/three-streams-types"
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

function formatEventTime(value?: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2000) return null
  return {
    absolute: format(date, "MMM d, yyyy · h:mm a"),
    relative: formatDistanceToNow(date, { addSuffix: true }),
  }
}

function streamLabelForConnector(streams: Stream[], connector: string) {
  const normalized = connector.toLowerCase()
  if (normalized.includes("projex")) return streams.find((s) => s.id === "projex")?.label ?? "Projex"
  if (normalized.includes("mentor") || normalized.includes("ship")) {
    return streams.find((s) => s.id === "mentorship")?.label ?? "Mentorship"
  }
  if (
    normalized.includes("vtu") ||
    normalized.includes("placement") ||
    normalized.includes("job")
  ) {
    return streams.find((s) => s.id === "vtu")?.label ?? "Placement"
  }
  return formatConnectorLabel(connector)
}

function StreamCourseCard({
  stream,
  onOpen,
}: {
  stream: Stream
  onOpen: (stream: Stream) => void
}) {
  const Icon = ICON_MAP[stream.icon] ?? Briefcase
  const activityCount = stream.activity_count ?? 0
  const contributes = stream.contributes ?? []
  const latest = stream.recent_events?.[0]
  const latestTime = formatEventTime(latest?.received_at || latest?.occurred_at)
  const chartIndex = STREAM_CHART_INDEX[stream.id] ?? 4
  const progress = Math.min(100, activityCount > 0 ? Math.max(12, Math.round(Math.min(activityCount, 40) * 2.5)) : 0)

  return (
    <button
      type="button"
      onClick={() => onOpen(stream)}
      className="group min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card
        className={cn(
          "h-full min-w-0 border-t-4 transition-colors group-hover:bg-muted/20",
          STREAM_BORDER_CLASS[chartIndex]
        )}
      >
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
              <span className="text-[10px] font-semibold tabular-nums">{activityCount}</span>
            </ProgressRing>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Observations ingested</span>
              <span>{activityCount}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(progress, activityCount > 0 ? 8 : 0)}%`,
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
          {latest ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              Latest: {latest.label}
              {latest.detail ? ` — ${latest.detail}` : ""}
              {latestTime ? ` · ${latestTime.relative}` : ""}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No activity yet — events will appear here when this stream sends data.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border/60 py-3 text-xs text-muted-foreground">
          <span>
            {stream.type_counts?.length ?? 0} activity type
            {(stream.type_counts?.length ?? 0) === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-foreground/80 group-hover:text-foreground">
            View details <ChevronRight className="size-3.5" />
          </span>
        </CardFooter>
      </Card>
    </button>
  )
}

function TraitScoringSection({
  traits,
  onOpenTrait,
}: {
  traits: StreamTraitLink[]
  onOpenTrait: (trait: StreamTraitLink) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">How trait scores are calculated</CardTitle>
        <p className="text-xs text-muted-foreground">
          Observations from your streams become signals. Those signals update each trait score.
          Open a trait to see the exact evidence behind the number.
        </p>
      </CardHeader>
      <CardContent>
        {traits.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Trait scores will appear after activity is processed into your profile.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {traits.slice(0, 9).map((trait) => (
              <button
                key={trait.trait}
                type="button"
                onClick={() => onOpenTrait(trait)}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{trait.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {trait.evidence_count} observation
                    {trait.evidence_count === 1 ? "" : "s"} used
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">{trait.score}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StreamDetailSheet({
  stream,
  open,
  onOpenChange,
  onOpenTrait,
}: {
  stream: Stream | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenTrait: (trait: StreamTraitLink) => void
}) {
  if (!stream) return null
  const Icon = ICON_MAP[stream.icon] ?? Briefcase

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border bg-muted/50">
              <Icon className="size-5" />
            </div>
            <div>
              <SheetTitle>{stream.label}</SheetTitle>
              <SheetDescription>{stream.subtitle}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-1 pb-6">
          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              What this stream contributes
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {stream.contributes.map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Activity types seen
            </h3>
            {stream.type_counts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No observations ingested yet.</p>
            ) : (
              <ul className="space-y-2">
                {stream.type_counts.map((type) => (
                  <li
                    key={type.observation_type}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>{type.label}</span>
                    <span className="tabular-nums text-muted-foreground">{type.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Linked trait scores
            </h3>
            {stream.linked_traits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scored traits linked to this stream yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {stream.linked_traits.map((trait) => (
                  <li key={trait.trait}>
                    <button
                      type="button"
                      onClick={() => onOpenTrait(trait)}
                      className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
                    >
                      <span>
                        {trait.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {trait.evidence_count} obs
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                        {trait.score}
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Recent events
            </h3>
            {stream.recent_events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events in this stream yet.</p>
            ) : (
              <ul className="space-y-2">
                {stream.recent_events.map((event) => {
                  const when = formatEventTime(event.received_at || event.occurred_at)
                  return (
                    <li key={event.id} className="rounded-lg border px-3 py-2.5">
                      <p className="text-sm font-medium">{event.label}</p>
                      {event.detail ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
                      ) : null}
                      {when ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {when.absolute} · {when.relative}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ThreeStreamsView({ data }: ThreeStreamsViewProps) {
  const streams = data.streams ?? []
  const recentActivity = data.recent_activity ?? []
  const traits = data.traits ?? []

  const [selectedStream, setSelectedStream] = useState<Stream | null>(null)
  const [streamOpen, setStreamOpen] = useState(false)
  const [evidenceTrait, setEvidenceTrait] = useState<StreamTraitLink | null>(null)

  const connectorLabel = useMemo(
    () => (connector: string) => streamLabelForConnector(streams, connector),
    [streams]
  )

  function openStream(stream: Stream) {
    setSelectedStream(stream)
    setStreamOpen(true)
  }

  function openTrait(trait: StreamTraitLink) {
    setEvidenceTrait(trait)
  }

  function focusActivity(activity: StreamActivityEvent) {
    const label = connectorLabel(activity.connector).toLowerCase()
    const stream =
      streams.find((s) => s.label.toLowerCase() === label) ??
      streams.find((s) =>
        s.recent_events.some((event) => event.id === activity.id)
      )
    if (stream) openStream(stream)
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PortalPageHeader
        title={data.title}
        description={
          data.subtitle ??
          "Live activity from Placement, Projex, and Mentorship — and how it feeds your trait scores."
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {streams.map((stream) => (
          <StreamCourseCard key={stream.id} stream={stream} onOpen={openStream} />
        ))}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <LazyStreamActivityChart streams={streams} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <RecentActivityCard
            activities={recentActivity.slice(0, 8)}
            onSelect={focusActivity}
            streamLabelByConnector={connectorLabel}
          />
        </div>
      </div>

      <TraitScoringSection traits={traits} onOpenTrait={openTrait} />

      <StreamDetailSheet
        stream={selectedStream}
        open={streamOpen}
        onOpenChange={setStreamOpen}
        onOpenTrait={(trait) => {
          setStreamOpen(false)
          openTrait(trait)
        }}
      />

      {evidenceTrait ? (
        <CompetencyEvidenceDialog
          open={Boolean(evidenceTrait)}
          onOpenChange={(open) => {
            if (!open) setEvidenceTrait(null)
          }}
          roleTitle="Your profile"
          trait={evidenceTrait.trait}
          competencyName={evidenceTrait.name}
          score={evidenceTrait.score}
          sourceLabels={{}}
        />
      ) : null}
    </div>
  )
}
