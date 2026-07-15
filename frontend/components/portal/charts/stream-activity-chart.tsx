"use client"

import { ArrowRight } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import type { Stream } from "@/lib/profiling/three-streams-types"

const chartConfig = {
  activity: {
    label: "Activities",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

type StreamActivityChartProps = {
  streams: Stream[]
  title?: string
}

export function StreamActivityChart({ streams, title = "Stream Activity" }: StreamActivityChartProps) {
  const chartData = streams.map((stream) => ({
    stream: stream.label,
    activity:
      (stream.recent_highlights?.length ?? 0) +
      (stream.activities_we_consider?.length ?? 0) +
      (stream.contributes?.length ?? 0),
    highlights: stream.recent_highlights?.length ?? 0,
  }))

  const hasActivity = chartData.some((item) => item.activity > 0)

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardAction className="flex items-center gap-1 text-xs text-muted-foreground">
          View Streams <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0">
        {!hasActivity ? (
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center">
            <p className="text-sm text-muted-foreground">
              Activity will appear here as Placement, Proje-x, and Mentorship send verified signals.
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
              <Bar dataKey="activity" fill="var(--color-activity)" radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
