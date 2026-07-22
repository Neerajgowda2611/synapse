"use client"

import { Label, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { CareerDiscoveryRole } from "@/lib/profiling/career-discovery-types"

const chartConfig = {
  score: { label: "Match" },
  r1: { color: "var(--chart-1)", label: "Top match" },
  r2: { color: "var(--chart-2)", label: "Strong" },
  r3: { color: "var(--chart-3)", label: "Good" },
  r4: { color: "var(--chart-4)", label: "Emerging" },
  r5: { color: "var(--chart-5)", label: "Explore" },
} satisfies ChartConfig

const colorKeys = ["r1", "r2", "r3", "r4", "r5"] as const

type MatchDistributionChartProps = {
  roles: CareerDiscoveryRole[]
  title?: string
}

export function MatchDistributionChart({
  roles,
  title = "Career Match Distribution",
}: MatchDistributionChartProps) {
  const topRoles = [...roles].sort((a, b) => b.match_score - a.match_score).slice(0, 5)
  const total = topRoles.reduce((sum, role) => sum + role.match_score, 0) || 1

  const chartData = topRoles.map((role, index) => {
    const key = colorKeys[index % colorKeys.length]
    return {
      key,
      role: role.title,
      score: role.match_score,
      percentage: Math.round((role.match_score / total) * 100),
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
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No roles to compare.</p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-50">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel className="w-52" nameKey="role" />}
                />
                <Pie
                  cornerRadius={6}
                  data={chartData}
                  dataKey="score"
                  innerRadius={65}
                  nameKey="role"
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
                            Top fit
                          </tspan>
                          <tspan
                            className="fill-foreground text-lg font-medium tabular-nums"
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 14}
                          >
                            {topRoles[0]?.match_score ?? 0}%
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
                <div className="grid grid-cols-[1fr_auto] items-end gap-3" key={item.role}>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1">
                      <span
                        aria-hidden="true"
                        className="h-2 w-1 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <p className="truncate text-xs text-muted-foreground">{item.role}</p>
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
