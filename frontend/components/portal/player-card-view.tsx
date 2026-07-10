"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { CompetencyEvidenceDialog } from "@/components/portal/competency-evidence-dialog"
import { CompetencyPerformanceChart } from "@/components/portal/charts/competency-performance-chart"
import { CompetencyStatusChart } from "@/components/portal/charts/competency-status-chart"
import { ProfileHeaderCard, ProfileKpis } from "@/components/portal/charts/profile-kpis"
import { RoleFitGauge } from "@/components/portal/charts/role-fit-gauge"
import { TraitAllocationChart } from "@/components/portal/charts/trait-allocation-chart"
import { JobFitBreakdownPanel } from "@/components/portal/job-fit-breakdown-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePortalUser } from "@/contexts/portal-user-context"
import type { CompetencyView, PlayerCardViewData, RoleView } from "@/lib/profiling/types"

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
          <Card key={competency.trait} className="flex flex-col py-4">
            <CardContent className="flex flex-1 flex-col px-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {competency.missing ? "—" : `${competency.score}%`}
                </span>
                {competency.verified && !competency.missing ? (
                  <Badge variant="outline" className="flex size-6 shrink-0 items-center justify-center rounded-full p-0">
                    <Check className="size-3 text-muted-foreground" />
                  </Badge>
                ) : null}
              </div>
              <p className="mb-1 text-sm font-medium text-foreground">{competency.name}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                {competency.missing ? (
                  "Not enough evidence yet"
                ) : (
                  <>
                    Role weight: {competency.roleWeightPct}% &bull; +{competency.matchPoints} match pts
                  </>
                )}
              </p>
              <div className="mb-4 flex flex-wrap gap-1.5">
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
                View Evidence &rarr;
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
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">{role.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{role.focus}</p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Role Fit</p>
          <p className="text-4xl font-bold tabular-nums tracking-tight">{role.fitPercent}%</p>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickSummaryCard({ competencies }: { competencies: CompetencyView[] }) {
  const verified = competencies.filter((c) => c.verified && !c.missing).length
  const missing = competencies.filter((c) => c.missing).length

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">Quick Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Verified traits</span>
          <span className="font-medium tabular-nums">{verified}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Needs evidence</span>
          <span className="font-medium tabular-nums">{missing}</span>
        </div>
        <Separator />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Charts show your competency strength and evidence status. Tap any card below for the full trail.
        </p>
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
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl tracking-tight">Career Explorer</h2>
              <p className="text-sm text-muted-foreground">
                See how your verified signals map to each role — scores, fit, and evidence.
              </p>
            </div>
            <TabsList className="h-auto flex-wrap">
              {data.roles.map((role) => (
                <TabsTrigger key={role.id} value={role.id} className="text-xs sm:text-sm">
                  {role.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {data.roles.map((role) => (
            <TabsContent key={role.id} value={role.id} className="flex flex-col gap-4">
              <RoleSummaryCard role={role} />

              {role.fitBreakdown ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Match Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JobFitBreakdownPanel breakdown={role.fitBreakdown} />
                  </CardContent>
                </Card>
              ) : null}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-12">
                <div className="lg:col-span-1 xl:col-span-4">
                  <RoleFitGauge fitPercent={role.fitPercent} roleTitle={role.title} />
                </div>
                <div className="lg:col-span-1 xl:col-span-8">
                  <TraitAllocationChart competencies={role.competencies.filter((c) => !c.missing)} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <CompetencyPerformanceChart competencies={role.competencies} />
                </div>
                <div className="xl:col-span-4">
                  <QuickSummaryCard competencies={role.competencies} />
                </div>
              </div>

              <CompetencyStatusChart competencies={role.competencies} />

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

      {evidenceSelection && (
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
      )}
    </>
  )
}
