"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import type { AnalyticsSummary } from "@/lib/admin/load-analytics"

const chartConfig = {
  imported: {
    label: "Imported",
    color: "var(--chart-2)",
  },
  failed: {
    label: "Failed",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

type IngestionTrendChartProps = {
  trend: AnalyticsSummary["ingestionTrend"]
}

export function IngestionTrendChart({ trend }: IngestionTrendChartProps) {
  const hasData = trend.some((item) => item.imported > 0 || item.failed > 0)

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-sm">Ingestion trend</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            Run a sync on at least one data source to populate ingestion trends.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 min-w-[260px] w-full">
            <BarChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
              <Bar dataKey="imported" fill="var(--color-imported)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" fill="var(--color-failed)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
