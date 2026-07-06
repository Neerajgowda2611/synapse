"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CompetencyEvidenceDialog } from "@/components/portal/competency-evidence-dialog"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {role.competencies.map((competency) => (
          <Card key={competency.trait} className="flex flex-col bg-muted/30 py-4">
            <CardContent className="flex flex-1 flex-col px-4">
              <div className="mb-3 flex items-start justify-between">
                <span className="text-2xl font-bold text-foreground">{competency.score}%</span>
                {competency.verified && (
                  <Badge
                    variant="outline"
                    className="flex size-6 items-center justify-center rounded-full p-0"
                  >
                    <Check className="size-3 text-muted-foreground" />
                  </Badge>
                )}
              </div>
              <p className="mb-3 text-sm font-medium text-foreground">{competency.name}</p>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {competency.sourceIds.map((sourceId) => (
                  <Badge
                    key={sourceId}
                    variant="outline"
                    className="text-[10px] uppercase tracking-wide"
                  >
                    {sourceLabelMap[sourceId] ?? sourceId}
                  </Badge>
                ))}
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-auto h-auto cursor-pointer justify-start p-0 text-xs text-muted-foreground"
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

export function PlayerCardView({ data }: PlayerCardViewProps) {
  const { name } = usePortalUser()
  const [selectedRoleId, setSelectedRoleId] = useState(data.roles[0]?.id ?? "")
  const [evidenceSelection, setEvidenceSelection] = useState<EvidenceSelection | null>(null)

  function handleViewEvidence(role: RoleView, competency: CompetencyView) {
    setEvidenceSelection({
      roleTitle: role.title,
      competency,
    })
  }

  return (
    <>
      <div className="space-y-6 **:data-[slot=accordion-trigger]:cursor-pointer **:data-[slot=dropdown-menu-item]:cursor-pointer **:data-[slot=dropdown-menu-trigger]:cursor-pointer **:data-[slot=tabs-trigger]:cursor-pointer [&_a]:cursor-pointer [&_button]:cursor-pointer **:[[role=menuitem]]:cursor-pointer **:[[role=tab]]:cursor-pointer">
        <Card className="py-6">
          <CardHeader className="px-6 pb-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {name}
            </h1>
          </CardHeader>
        </Card>

        <Tabs
          value={selectedRoleId}
          onValueChange={setSelectedRoleId}
          className="flex w-full flex-col gap-4"
        >
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-foreground">Career Explorer</h2>
            <TabsList>
              {data.roles.map((role) => (
                <TabsTrigger
                  key={role.id}
                  value={role.id}
                  className="cursor-pointer px-4"
                >
                  {role.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {data.roles.map((role) => (
            <TabsContent key={role.id} value={role.id} className="w-full">
              <Card className="py-6">
                <CardContent className="px-6">
                  <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{role.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{role.focus}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        Role Fit Alignment
                      </p>
                      <p className="text-4xl font-bold tracking-tight text-foreground">
                        {role.fitPercent}%
                      </p>
                    </div>
                  </div>

                  <Separator className="mb-6" />

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
