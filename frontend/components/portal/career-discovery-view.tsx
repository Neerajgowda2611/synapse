"use client"

import { useMemo, useState } from "react"
import { ArrowRight, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { DiscoveryKpis } from "@/components/portal/charts/discovery-kpis"
import { LazyMatchDistributionChart } from "@/components/charts/lazy-charts"
import { JobFitBreakdownPanel } from "@/components/portal/job-fit-breakdown-panel"
import { PortalPageHeader } from "@/components/portal/portal-page-header"
import { ProgressRing } from "@/components/portal/progress-ring"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type {
  CareerDiscoveryResponse,
  CareerDiscoveryRole,
} from "@/lib/profiling/career-discovery-types"

const chartConfig = {
  match: { label: "Match", color: "var(--chart-1)" },
} satisfies ChartConfig

type CareerDiscoveryViewProps = {
  data: CareerDiscoveryResponse
}

function sortRoles(roles: CareerDiscoveryRole[], sortId: string): CareerDiscoveryRole[] {
  const sorted = [...roles]
  if (sortId === "role_title") return sorted.sort((a, b) => a.title.localeCompare(b.title))
  return sorted.sort((a, b) => b.match_score - a.match_score)
}

function MatchScoreChart({ roles }: { roles: CareerDiscoveryRole[] }) {
  const chartData = roles.slice(0, 6).map((role) => ({
    role: role.title.length > 18 ? `${role.title.slice(0, 16)}…` : role.title,
    fullTitle: role.title,
    match: role.match_score,
  }))
  const chartHeight = Math.max(220, chartData.length * 44 + 48)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Role comparison</CardTitle>
        <CardAction className="flex items-center gap-1 text-xs text-muted-foreground">
          Match scores <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No roles to compare.</p>
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
                dataKey="role"
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
              <Bar dataKey="match" fill="var(--color-match)" radius={4} barSize={24} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function RoleDiscoveryCard({
  role,
  addToProfileLabel,
}: {
  role: CareerDiscoveryRole
  addToProfileLabel: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="overflow-hidden transition hover:shadow-sm">
      <CardContent className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-start">
          <ProgressRing value={role.match_score} size={72} strokeWidth={6}>
            <div className="text-center">
              <p className="text-base font-semibold tabular-nums leading-none">{role.match_score}%</p>
            </div>
          </ProgressRing>

          <div className="min-w-0 space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {role.category}
            </p>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{role.title}</h2>
            {role.subtitle ? <p className="text-sm text-muted-foreground">{role.subtitle}</p> : null}
            <div className="flex flex-wrap gap-2">
              {role.skills.map((skill) => (
                <Badge key={skill} variant="outline" className="rounded-md text-[10px] uppercase">
                  {skill}
                </Badge>
              ))}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{role.description}</p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <Badge variant="secondary" className="font-normal">
              {role.match_label}
            </Badge>
            {role.external_url ? (
              <a
                href={role.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View on Placement
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <Button variant="link" className="h-auto p-0 text-sm">
                {addToProfileLabel}
              </Button>
            )}
          </div>
        </div>

        {role.fit_breakdown ? (
          <div className="border-t border-border/60 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-2 px-0 text-sm font-medium text-primary hover:bg-transparent"
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {expanded ? "Hide match breakdown" : "How this score is calculated"}
            </Button>
            {expanded ? <JobFitBreakdownPanel breakdown={role.fit_breakdown} className="mt-4" /> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function CareerDiscoveryView({ data }: CareerDiscoveryViewProps) {
  const [sortId, setSortId] = useState(data.sort.default_option_id)
  const sortedRoles = useMemo(() => sortRoles(data.roles, sortId), [data.roles, sortId])
  const activeSort =
    data.sort.options.find((option) => option.id === sortId) ?? data.sort.options[0]

  return (
    <div className="flex flex-col gap-4">
      <PortalPageHeader
        title={data.title}
        description={data.subtitle}
        action={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="shrink-0">{data.sort.label}:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 min-w-36 justify-between gap-2">
                  <span className="truncate">{activeSort.label}</span>
                  <ChevronDown className="size-4 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuGroup>
                  {data.sort.options.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      className={cn(sortId === option.id && "bg-accent")}
                      onClick={() => setSortId(option.id)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <DiscoveryKpis roles={sortedRoles} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <LazyMatchDistributionChart roles={sortedRoles} />
        </div>
        <div className="xl:col-span-7">
          <MatchScoreChart roles={sortedRoles} />
        </div>
      </div>

      <div className="space-y-4">
        {sortedRoles.map((role) => (
          <RoleDiscoveryCard key={role.id} role={role} addToProfileLabel={data.add_to_profile_label} />
        ))}
      </div>
    </div>
  )
}
