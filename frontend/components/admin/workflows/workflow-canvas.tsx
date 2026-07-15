"use client"

import { ArrowRight, Database, GitBranch, Sparkles, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const WORKFLOW_STEPS = [
  {
    id: "ingest",
    title: "Ingest",
    description: "Pull records from connectors or receive webhook events.",
    icon: Database,
    status: "active",
  },
  {
    id: "map",
    title: "Map",
    description: "Assign entities and fields to canonical CPS domains.",
    icon: GitBranch,
    status: "active",
  },
  {
    id: "derive",
    title: "Derive",
    description: "Run signal rules and trait derivations on observations.",
    icon: Sparkles,
    status: "preview",
  },
  {
    id: "profile",
    title: "Profile",
    description: "Publish learner-facing player card and career discovery views.",
    icon: UserRound,
    status: "preview",
  },
] as const

export function WorkflowCanvas() {
  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Visual workflow designer preview for Phase 10. Steps reflect the current ingestion
          pipeline — drag-and-drop editing will ship with the workflow engine.
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
        {WORKFLOW_STEPS.map((step, index) => (
          <div key={step.id} className="contents">
            <Card className={cn(step.status === "preview" && "border-dashed opacity-90")}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="grid size-10 place-items-center rounded-xl border bg-muted/40">
                    <step.icon className="size-5" />
                  </div>
                  <Badge variant={step.status === "active" ? "default" : "outline"}>
                    {step.status === "active" ? "Live" : "Planned"}
                  </Badge>
                </div>
                <CardTitle className="text-base">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
            {index < WORKFLOW_STEPS.length - 1 ? (
              <div className="hidden items-center justify-center lg:flex">
                <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
