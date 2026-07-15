"use client"

import { Label, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { CompetencyView } from "@/lib/profiling/types"

const chartConfig = {
  score: { label: "Score" },
  c1: { color: "var(--chart-1)", label: "Primary" },
  c2: { color: "var(--chart-2)", label: "Secondary" },
  c3: { color: "var(--chart-3)", label: "Tertiary" },
  c4: { color: "var(--chart-4)", label: "Quaternary" },
  c5: { color: "var(--chart-5)", label: "Quinary" },
} satisfies ChartConfig

const colorKeys = ["c1", "c2", "c3", "c4", "c5"] as const

type TraitAllocationChartProps = {
  competencies: CompetencyView[]
  title?: string
}

export function TraitAllocationChart({
  competencies,
  title = "Trait Allocation",
}: TraitAllocationChartProps) {
  const total = competencies.reduce((sum, item) => sum + item.score, 0) || 1

  const chartData = competencies.map((item, index) => {
    const key = colorKeys[index % colorKeys.length]
    return {
      key,
      trait: item.name,
      score: item.score,
      percentage: Math.round((item.score / total) * 100),
      fill: chartConfig[key].color,
    }
  })

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-normal">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid items-center gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        {chartData.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No traits to visualize.</p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-50">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel className="w-52" nameKey="trait" />}
                />
                <Pie
                  cornerRadius={6}
                  data={chartData}
                  dataKey="score"
                  innerRadius={65}
                  nameKey="trait"
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (!(viewBox && "cx" in viewBox && "cy" in viewBox)) return null
                      return (
                        <text dominantBaseline="middle" textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                          <tspan className="fill-muted-foreground text-xs" x={viewBox.cx} y={(viewBox.cy ?? 0) - 8}>
                            Total
                          </tspan>
                          <tspan
                            className="fill-foreground text-lg font-medium tabular-nums"
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 14}
                          >
                            {total}
                          </tspan>
                        </text>
                      )
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex min-w-0 flex-col gap-3">
              {chartData.map((item) => (
                <div className="grid grid-cols-[1fr_auto] items-end gap-3" key={item.trait}>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1">
                      <span
                        aria-hidden="true"
                        className="h-2 w-1 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <p className="truncate text-xs text-muted-foreground">{item.trait}</p>
                    </div>
                    <p className="font-medium tabular-nums">{item.score}%</p>
                  </div>
                  <div className="font-medium tabular-nums">{item.percentage}%</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
