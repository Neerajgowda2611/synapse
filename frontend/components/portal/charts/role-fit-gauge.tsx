"use client"

import { ArrowUpRight } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"

const chartConfig = {
  strong: { color: "var(--chart-2)", label: "Strong fit" },
  moderate: { color: "var(--chart-1)", label: "Moderate fit" },
  developing: { color: "var(--chart-4)", label: "Developing" },
} satisfies ChartConfig

const gaugeSegmentCount = 32

function buildGaugeSegments(score: number) {
  const strongSegments = Math.round((Math.min(score, 100) / 100) * gaugeSegmentCount)
  const moderateSegments = Math.round((Math.max(score - 60, 0) / 40) * (gaugeSegmentCount / 4))
  const developingSegments = gaugeSegmentCount - strongSegments - moderateSegments

  const segments: Array<{ fill: string; id: string; value: number }> = []
  let index = 0

  for (let i = 0; i < strongSegments; i++) {
    segments.push({ fill: "var(--color-strong)", id: `s-${index++}`, value: 1 })
  }
  for (let i = 0; i < moderateSegments; i++) {
    segments.push({ fill: "var(--color-moderate)", id: `m-${index++}`, value: 1 })
  }
  for (let i = 0; i < developingSegments; i++) {
    segments.push({ fill: "var(--color-developing)", id: `d-${index++}`, value: 1 })
  }

  return segments
}

type RoleFitGaugeProps = {
  fitPercent: number
  roleTitle: string
}

export function RoleFitGauge({ fitPercent, roleTitle }: RoleFitGaugeProps) {
  const gaugeSegments = buildGaugeSegments(fitPercent)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">Role Fit</CardTitle>
        <CardDescription className="text-xl leading-none tracking-tight text-foreground tabular-nums">
          {fitPercent}% aligned
        </CardDescription>
        <CardAction>
          <ArrowUpRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ChartContainer config={chartConfig} className="mx-auto h-30 w-full">
          <PieChart>
            <Pie
              cx="50%"
              cy="100%"
              cornerRadius={6}
              data={gaugeSegments}
              dataKey="value"
              endAngle={0}
              innerRadius={80}
              outerRadius={110}
              paddingAngle={2}
              startAngle={180}
              stroke="var(--card)"
              strokeWidth={1}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                        <tspan
                          className="fill-foreground text-2xl font-medium tabular-nums"
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 22}
                        >
                          {fitPercent}%
                        </tspan>
                        <tspan
                          className="fill-muted-foreground text-xs"
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 38}
                        >
                          {roleTitle}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
