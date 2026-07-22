"use client"

import { ArrowRight, ArrowUp, Info } from "lucide-react"

import { ProgressRing } from "@/components/portal/progress-ring"
import { Badge } from "@/components/ui/badge"
import { tone } from "@/lib/ui/status-tones"
import { cn } from "@/lib/utils"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CompetencyView, RoleView } from "@/lib/profiling/types"

type ProfileKpisProps = {
  roles: RoleView[]
  competencies: CompetencyView[]
}

export function ProfileKpis({ roles, competencies }: ProfileKpisProps) {
  const scored = competencies.filter((item) => !item.missing)
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length)
      : 0
  const verifiedCount = competencies.filter((item) => item.verified && !item.missing).length
  const missingCount = competencies.filter((item) => item.missing).length
  const topFit = roles.length > 0 ? Math.max(...roles.map((role) => role.fitPercent)) : 0

  const items = [
    {
      title: "Profile Strength",
      value: scored.length > 0 ? `${avgScore}%` : "—",
      delta: `${verifiedCount} verified`,
      positive: scored.length > 0,
    },
    {
      title: "Best Role Fit",
      value: `${topFit}%`,
      delta: roles[0]?.title ?? "No roles yet",
      positive: topFit >= 70,
    },
    {
      title: "Competencies",
      value: String(competencies.length),
      delta:
        missingCount > 0
          ? `${verifiedCount} verified · ${missingCount} need evidence`
          : `${verifiedCount} verified`,
      positive: verifiedCount > 0,
    },
    {
      title: "Career Paths",
      value: String(roles.length),
      delta: "roles explored",
      positive: roles.length > 0,
    },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader>
            <CardTitle className="text-sm">{item.title}</CardTitle>
            <CardAction>
              <Info className="size-3 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-3xl leading-none tracking-tight text-foreground">{item.value}</span>
              {item.positive && (
                <Badge className={cn("rounded-sm px-1 font-normal text-xs", tone.success.badge)}>
                  <ArrowUp />
                  Active
                </Badge>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground">{item.delta}</div>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

export function ProfileHeaderCard({
  name,
  roleCount,
}: {
  name: string
  roleCount: number
}) {
  const strength = roleCount > 0 ? Math.min(100, 40 + roleCount * 15) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Learner profile</CardTitle>
        <CardAction className="flex items-center gap-1 text-xs text-muted-foreground">
          View insights <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <ProgressRing value={strength} size={64} strokeWidth={6}>
            <span className="text-sm font-semibold tabular-nums">{roleCount}</span>
          </ProgressRing>
          <div className="space-y-1">
            <h1 className="text-2xl tracking-tight sm:text-3xl">{name}</h1>
            <p className="text-sm text-muted-foreground">
              Verified signals from Placement, Mentorship, and Proje-x across {roleCount} career
              paths.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
