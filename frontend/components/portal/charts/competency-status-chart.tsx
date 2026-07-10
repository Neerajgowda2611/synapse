"use client"

import { ArrowRight } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import type { CompetencyView } from "@/lib/profiling/types"

function StrongLegendIcon() {
  return <span className="block size-2 rounded-[2px] bg-chart-3" />
}

function PartialLegendIcon() {
  return <span className="block size-2 rounded-[2px] bg-chart-2" />
}

function MissingLegendIcon() {
  return <span className="block size-2 rounded-[2px] bg-destructive" />
}

const chartConfig = {
  strong: {
    label: "Strong",
    color: "var(--chart-3)",
    icon: StrongLegendIcon,
  },
  partial: {
    label: "Developing",
    color: "var(--chart-2)",
    icon: PartialLegendIcon,
  },
  missing: {
    label: "No evidence",
    color: "var(--destructive)",
    icon: MissingLegendIcon,
  },
} satisfies ChartConfig

function shortLabel(name: string, max = 14) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

function toStatusRows(competencies: CompetencyView[]) {
  return competencies.map((item) => {
    if (item.missing) {
      return {
        trait: shortLabel(item.name),
        strong: 0,
        partial: 0,
        missing: item.roleWeightPct || 10,
      }
    }

    if (item.score >= 70) {
      return {
        trait: shortLabel(item.name),
        strong: item.score,
        partial: Math.max(0, 100 - item.score),
        missing: 0,
      }
    }

    return {
      trait: shortLabel(item.name),
      strong: Math.round(item.score * 0.4),
      partial: item.score,
      missing: Math.max(0, 100 - item.score),
    }
  })
}

type CompetencyStatusChartProps = {
  competencies: CompetencyView[]
}

export function CompetencyStatusChart({ competencies }: CompetencyStatusChartProps) {
  const chartData = toStatusRows(competencies)
  const chartHeight = Math.max(220, chartData.length * 44 + 72)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Competency Status</CardTitle>
        <CardAction className="flex items-center gap-1 text-xs text-muted-foreground">
          View Report <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No competency data yet.</p>
        ) : (
          <ChartContainer config={chartConfig} className={cn("w-full")} style={{ height: chartHeight }}>
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="4 4" />
              <YAxis
                axisLine={false}
                dataKey="trait"
                tickLine={false}
                tickMargin={8}
                type="category"
                width={108}
              />
              <XAxis axisLine={false} domain={[0, 100]} tickLine={false} type="number" hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
              <ChartLegend content={<ChartLegendContent className="justify-start" />} verticalAlign="top" />
              <Bar dataKey="strong" fill="var(--color-strong)" radius={4} stackId="status" barSize={22} />
              <Bar dataKey="partial" fill="var(--color-partial)" radius={4} stackId="status" barSize={22} />
              <Bar dataKey="missing" fill="var(--color-missing)" radius={4} stackId="status" barSize={22} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
