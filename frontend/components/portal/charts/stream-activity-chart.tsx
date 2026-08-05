"use client"

import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import type { Stream } from "@/lib/profiling/three-streams-types"

const STREAM_COLORS: Record<string, string> = {
  vtu: "var(--chart-1)",
  projex: "var(--chart-2)",
  mentorship: "var(--chart-3)",
}

const chartConfig = {
  activity: {
    label: "Observations",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

type StreamActivityChartProps = {
  streams: Stream[]
  title?: string
}

export function StreamActivityChart({
  streams,
  title = "Activity by stream",
}: StreamActivityChartProps) {
  const chartData = streams.map((stream) => ({
    id: stream.id,
    stream: stream.label,
    activity: stream.activity_count ?? 0,
    types: stream.type_counts?.length ?? 0,
  }))

  const hasActivity = chartData.some((item) => item.activity > 0)
  const total = chartData.reduce((sum, item) => sum + item.activity, 0)

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {hasActivity ? (
          <p className="text-xs text-muted-foreground">
            {total} observation{total === 1 ? "" : "s"} ingested across your streams
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0">
        {!hasActivity ? (
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center">
            <p className="text-sm text-muted-foreground">
              Activity will appear here as Placement, Projex, and Mentorship send verified signals.
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 min-w-[260px] w-full">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="4 4" />
              <XAxis
                axisLine={false}
                dataKey="stream"
                interval={0}
                tickLine={false}
                tickMargin={10}
                angle={-12}
                textAnchor="end"
                height={48}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                width={32}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0]?.payload as {
                    stream: string
                    activity: number
                    types: number
                  }
                  return (
                    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
                      <p className="font-medium">{row.stream}</p>
                      <p className="text-muted-foreground">
                        {row.activity} observation{row.activity === 1 ? "" : "s"}
                        {row.types > 0 ? ` · ${row.types} type${row.types === 1 ? "" : "s"}` : ""}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="activity" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={STREAM_COLORS[entry.id] ?? "var(--chart-4)"} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
