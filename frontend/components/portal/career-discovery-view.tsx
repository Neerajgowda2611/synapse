"use client"

import { useMemo, useState } from "react"
import { ArrowRight, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { MatchDistributionChart } from "@/components/portal/charts/match-distribution-chart"
import { JobFitBreakdownPanel } from "@/components/portal/job-fit-breakdown-panel"
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
    role: role.title.length > 14 ? `${role.title.slice(0, 12)}…` : role.title,
    match: role.match_score,
  }))

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Match Performance</CardTitle>
        <CardAction className="flex items-center gap-1 text-xs text-muted-foreground">
          Compare Roles <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <ChartContainer config={chartConfig} className="h-64 min-w-[280px] w-full">
          <BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis
              axisLine={false}
              dataKey="role"
              interval={0}
              tickLine={false}
              tickMargin={10}
              angle={-20}
              textAnchor="end"
              height={56}
            />
            <YAxis axisLine={false} domain={[0, 100]} tickLine={false} tickMargin={10} width={32} />
            <Bar dataKey="match" fill="var(--color-match)" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ChartContainer>
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
    <Card>
      <CardContent className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0 space-y-4">
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

          <div className="flex flex-row items-center justify-between gap-6 lg:min-w-44 lg:flex-col lg:items-end">
            <div className="text-left lg:text-right">
              <p className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
                {role.match_score}%
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {role.match_label}
              </p>
            </div>
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight sm:text-3xl">{data.title}</h1>
          <p className="text-sm text-muted-foreground">{data.subtitle}</p>
        </div>

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
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <MatchDistributionChart roles={sortedRoles} />
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
