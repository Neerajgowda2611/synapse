"use client"

import { ArrowRight } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import type { CompetencyView } from "@/lib/profiling/types"

const chartConfig = {
  score: {
    label: "Your score",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

function shortLabel(name: string, max = 16) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

type CompetencyPerformanceChartProps = {
  competencies: CompetencyView[]
  title?: string
}

export function CompetencyPerformanceChart({
  competencies,
  title = "Competency Performance",
}: CompetencyPerformanceChartProps) {
  const chartData = competencies
    .filter((item) => !item.missing)
    .map((item) => ({
      label: shortLabel(item.name),
      fullName: item.name,
      score: item.score,
    }))

  const chartHeight = Math.max(200, chartData.length * 44 + 48)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardAction className="flex items-center gap-1 text-xs text-muted-foreground">
          View Evidence <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Scores appear here once you have verified evidence for competencies.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="w-full" style={{ height: chartHeight }}>
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="4 4" />
              <YAxis
                axisLine={false}
                dataKey="label"
                tickLine={false}
                tickMargin={8}
                type="category"
                width={112}
              />
              <XAxis
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                type="number"
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    formatter={(value, _name, item) => [
                      `${value}%`,
                      (item?.payload as { fullName?: string })?.fullName ?? "Score",
                    ]}
                  />
                }
              />
              <Bar
                dataKey="score"
                fill="var(--color-score)"
                radius={4}
                barSize={24}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
