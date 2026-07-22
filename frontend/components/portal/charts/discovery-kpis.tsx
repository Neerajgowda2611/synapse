"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProgressRing } from "@/components/portal/progress-ring"
import type { CareerDiscoveryRole } from "@/lib/profiling/career-discovery-types"

type DiscoveryKpisProps = {
  roles: CareerDiscoveryRole[]
}

export function DiscoveryKpis({ roles }: DiscoveryKpisProps) {
  const topMatch = roles.length > 0 ? Math.max(...roles.map((r) => r.match_score)) : 0
  const avgMatch =
    roles.length > 0
      ? Math.round(roles.reduce((sum, role) => sum + role.match_score, 0) / roles.length)
      : 0
  const strongMatches = roles.filter((role) => role.match_score >= 70).length

  const items = [
    { title: "Roles explored", value: String(roles.length), hint: "career paths" },
    { title: "Average match", value: `${avgMatch}%`, hint: "across roles" },
    { title: "Strong fits", value: String(strongMatches), hint: "70%+ match" },
  ]

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
      <Card className="flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <ProgressRing value={topMatch} size={88} strokeWidth={7}>
            <div className="text-center">
              <p className="text-xl font-semibold tabular-nums leading-none">{topMatch}%</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Top fit</p>
            </div>
          </ProgressRing>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
