"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { CompetencyEvidenceDialog } from "@/components/portal/competency-evidence-dialog"
import {
  LazyCompetencyPerformanceChart,
  LazyCompetencyStatusChart,
  LazyRoleFitGauge,
  LazyTraitAllocationChart,
} from "@/components/charts/lazy-charts"
import { ProfileHeaderCard, ProfileKpis } from "@/components/portal/charts/profile-kpis"
import { JobFitBreakdownPanel } from "@/components/portal/job-fit-breakdown-panel"
import { PortalPageHeader } from "@/components/portal/portal-page-header"
import { ProgressRing } from "@/components/portal/progress-ring"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePortalUser } from "@/contexts/portal-user-context"
import type { CompetencyView, PlayerCardViewData, RoleView } from "@/lib/profiling/types"
import { cn } from "@/lib/utils"

type PlayerCardViewProps = {
  data: PlayerCardViewData
}

type EvidenceSelection = {
  roleTitle: string
  competency: CompetencyView
}

function CompetencyGrid({
  role,
  sourceLabelMap,
  onViewEvidence,
}: {
  role: RoleView
  sourceLabelMap: Record<string, string>
  onViewEvidence: (competency: CompetencyView) => void
}) {
  return (
    <>
      <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Core Competencies
      </h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {role.competencies.map((competency) => (
          <Card
            key={competency.trait}
            className={cn(
              "flex flex-col transition hover:-translate-y-0.5 hover:shadow-sm",
              competency.missing && "opacity-90"
            )}
          >
            <CardContent className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <ProgressRing
                  value={competency.missing ? 0 : competency.score}
                  size={56}
                  strokeWidth={5}
                  indicatorChart={competency.verified ? 3 : 2}
                >
                  <span className="text-sm font-semibold tabular-nums">
                    {competency.missing ? "—" : `${competency.score}%`}
                  </span>
                </ProgressRing>
                {competency.verified && !competency.missing ? (
                  <Badge
                    variant="outline"
                    className="flex size-6 shrink-0 items-center justify-center rounded-full p-0"
                  >
                    <Check className="size-3 text-muted-foreground" />
                  </Badge>
                ) : null}
              </div>
              <div>
                <p className="text-sm font-medium">{competency.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {competency.missing
                    ? "Not enough evidence yet"
                    : `Weight ${competency.roleWeightPct}% · +${competency.matchPoints} pts`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {competency.sourceIds.map((sourceId) => (
                  <Badge key={sourceId} variant="outline" className="text-[10px] uppercase tracking-wide">
                    {sourceLabelMap[sourceId] ?? sourceId}
                  </Badge>
                ))}
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-auto h-auto justify-start p-0 text-xs text-muted-foreground"
                onClick={() => onViewEvidence(competency)}
              >
                View evidence trail &rarr;
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

function RoleSummaryCard({ role }: { role: RoleView }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <ProgressRing value={role.fitPercent} size={80} strokeWidth={7}>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums leading-none">{role.fitPercent}%</p>
            </div>
          </ProgressRing>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Role fit
            </p>
            <h3 className="text-xl font-semibold">{role.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{role.focus}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickSummaryCard({ competencies }: { competencies: CompetencyView[] }) {
  const verified = competencies.filter((c) => c.verified && !c.missing).length
  const missing = competencies.filter((c) => c.missing).length
  const scored = competencies.filter((c) => !c.missing)
  const avg =
    scored.length > 0
      ? Math.round(scored.reduce((sum, c) => sum + c.score, 0) / scored.length)
      : 0

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">At a glance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <ProgressRing value={avg} size={52} strokeWidth={5}>
            <span className="text-xs font-semibold tabular-nums">{avg || "—"}</span>
          </ProgressRing>
          <div className="text-sm">
            <p className="font-medium">Average strength</p>
            <p className="text-xs text-muted-foreground">Across scored competencies</p>
          </div>
        </div>
        <Separator />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Verified</span>
            <span className="font-medium tabular-nums">{verified}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Needs evidence</span>
            <span className="font-medium tabular-nums">{missing}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PlayerCardView({ data }: PlayerCardViewProps) {
  const { name } = usePortalUser()
  const [selectedRoleId, setSelectedRoleId] = useState(data.roles[0]?.id ?? "")
  const [evidenceSelection, setEvidenceSelection] = useState<EvidenceSelection | null>(null)

  const selectedRole = data.roles.find((role) => role.id === selectedRoleId) ?? data.roles[0]

  function handleViewEvidence(role: RoleView, competency: CompetencyView) {
    setEvidenceSelection({ roleTitle: role.title, competency })
  }

  if (!selectedRole) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No profile data available yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <ProfileHeaderCard name={name} roleCount={data.roles.length} />
        <ProfileKpis roles={data.roles} competencies={selectedRole.competencies} />

        <Tabs value={selectedRoleId} onValueChange={setSelectedRoleId} className="flex flex-col gap-4">
          <PortalPageHeader
            title="Career Explorer"
            description="See how your verified signals map to each role — scores, fit, and evidence."
            action={
              <TabsList className="h-auto w-full flex-wrap sm:w-auto">
                {data.roles.map((role) => (
                  <TabsTrigger key={role.id} value={role.id} className="text-xs sm:text-sm">
                    {role.title}
                  </TabsTrigger>
                ))}
              </TabsList>
            }
          />

          {data.roles.map((role) => (
            <TabsContent key={role.id} value={role.id} className="flex flex-col gap-4">
              <RoleSummaryCard role={role} />

              {role.fitBreakdown ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Match breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JobFitBreakdownPanel breakdown={role.fitBreakdown} />
                  </CardContent>
                </Card>
              ) : null}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-12">
                <div className="lg:col-span-1 xl:col-span-4">
                  <LazyRoleFitGauge fitPercent={role.fitPercent} roleTitle={role.title} />
                </div>
                <div className="lg:col-span-1 xl:col-span-8">
                  <LazyTraitAllocationChart competencies={role.competencies.filter((c) => !c.missing)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <LazyCompetencyPerformanceChart competencies={role.competencies} />
                </div>
                <div className="xl:col-span-4">
                  <QuickSummaryCard competencies={role.competencies} />
                </div>
              </div>

              <LazyCompetencyStatusChart competencies={role.competencies} />

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <CompetencyGrid
                    role={role}
                    sourceLabelMap={data.sourceLabels}
                    onViewEvidence={(competency) => handleViewEvidence(role, competency)}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {evidenceSelection ? (
        <CompetencyEvidenceDialog
          open={!!evidenceSelection}
          onOpenChange={(open) => {
            if (!open) setEvidenceSelection(null)
          }}
          roleTitle={evidenceSelection.roleTitle}
          trait={evidenceSelection.competency.trait}
          competencyName={evidenceSelection.competency.name}
          score={evidenceSelection.competency.score}
          sourceLabels={data.sourceLabels}
        />
      ) : null}
    </>
  )
}
