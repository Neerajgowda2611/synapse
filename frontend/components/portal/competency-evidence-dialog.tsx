"use client"

import { useEffect, useState } from "react"
import { User, Zap } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { getTraitEvidenceSafe } from "@/lib/api/profiler"
import { usePortalUser } from "@/contexts/portal-user-context"
import { mapTraitEvidenceToDialog, formatConnectorLabel } from "@/lib/profiling/mappers"
import type { CompetencyEvidence, EvidenceGroup, EvidenceItem } from "@/lib/profiling/evidence-types"

type CompetencyEvidenceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleTitle: string
  trait: string
  competencyName: string
  score: number
  sourceLabels: Record<string, string>
}

function formatOccurredAt(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function ObservationRow({ item }: { item: EvidenceItem }) {
  const occurredAt = formatOccurredAt(item.occurred_at)

  return (
    <Card className="bg-muted py-2 shadow-none">
      <CardContent className="flex items-start justify-between gap-3 px-3 py-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium text-foreground">{item.text}</p>
          {item.detail && (
            <p className="text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
          )}
        </div>
        {occurredAt && (
          <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{occurredAt}</span>
        )}
      </CardContent>
    </Card>
  )
}

function EvidenceGroupSection({ group }: { group: EvidenceGroup }) {
  if (group.count === 1) {
    return <ObservationRow item={group.items[0]} />
  }

  return (
    <AccordionItem value={group.group_id} className="border-0">
      <Card className="overflow-hidden bg-muted/40 py-0 shadow-none">
        <AccordionTrigger className="cursor-pointer px-3 py-3 hover:no-underline **:data-[slot=accordion-trigger-icon]:ml-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{group.title}</p>
              <p className="text-xs text-muted-foreground">{group.label}</p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {group.count}
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="border-t border-border px-3 pb-3">
          <div className="mt-2 space-y-2">
            {group.items.map((item) => (
              <ObservationRow key={item.id} item={item} />
            ))}
          </div>
        </AccordionContent>
      </Card>
    </AccordionItem>
  )
}

export function CompetencyEvidenceDialog({
  open,
  onOpenChange,
  roleTitle,
  trait,
  competencyName,
  score,
  sourceLabels,
}: CompetencyEvidenceDialogProps) {
  const { userId } = usePortalUser()
  const [evidence, setEvidence] = useState<CompetencyEvidence | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setEvidence(null)
      return
    }

    let cancelled = false
    setLoading(true)
    getTraitEvidenceSafe(userId, trait)
      .then((response) => {
        if (!cancelled) {
          setEvidence(response ? mapTraitEvidenceToDialog(response) : null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, userId, trait])

  const defaultOpenSources =
    evidence?.sources.filter((s) => s.default_open).map((s) => s.source_id) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[75vh] w-[75vw] max-w-[75vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[75vw] **:data-[slot=accordion-trigger]:cursor-pointer **:data-[slot=dropdown-menu-item]:cursor-pointer [&_button]:cursor-pointer"
      >
        <DialogHeader className="border-b border-border px-8 py-6">
          <div className="flex items-start gap-6">
            <Card className="flex size-20 shrink-0 items-center justify-center rounded-full py-0 shadow-none ring-1 ring-border">
              <CardContent className="flex items-center justify-center p-0 text-3xl font-bold text-foreground">
                {score}
              </CardContent>
            </Card>
            <div className="flex-1 space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Metric &bull; {roleTitle}
              </p>
              <DialogTitle className="text-3xl font-bold text-foreground">
                {competencyName}
              </DialogTitle>
              {evidence && (
                <p className="text-sm text-muted-foreground">{evidence.description}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          )}
          {!loading && !evidence && (
            <p className="text-sm text-muted-foreground">No evidence available.</p>
          )}
          {!loading && evidence && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Provenance Ladder
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your score is built from verified activities across your profile, projects,
                  and mentorship journey.
                </p>
              </div>

              <Accordion
                multiple
                defaultValue={defaultOpenSources}
                className="space-y-3"
              >
                {evidence.sources.map((source) => (
                  <AccordionItem
                    key={source.source_id}
                    value={source.source_id}
                    className="border-0"
                  >
                    <Card className="overflow-hidden py-0 shadow-none">
                      <AccordionTrigger className="cursor-pointer px-4 py-4 hover:no-underline **:data-[slot=accordion-trigger-icon]:ml-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <Card className="flex size-8 shrink-0 items-center justify-center bg-muted py-0 shadow-none">
                            <CardContent className="flex items-center justify-center p-0">
                              <Zap className="size-4 text-muted-foreground" />
                            </CardContent>
                          </Card>
                          <div className="min-w-0 flex-1 space-y-2 text-left">
                            <p className="text-sm font-semibold text-foreground">
                              {source.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {source.stats.map((stat, index) => (
                                <span key={stat.label} className="flex items-center gap-2">
                                  {index > 0 && (
                                    <Separator orientation="vertical" className="h-3" />
                                  )}
                                  {stat.label}
                                </span>
                              ))}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            <User className="size-3" />
                            {sourceLabels[source.source_id] ?? formatConnectorLabel(source.source_id)}
                          </Badge>
                        </div>
                      </AccordionTrigger>

                      {source.groups.length > 0 && (
                        <AccordionContent className="border-t border-border px-4 pb-4">
                          <div className="mt-4 space-y-2 border-l border-border pl-4">
                            <Accordion multiple className="space-y-2">
                              {source.groups.map((group) => (
                                <EvidenceGroupSection key={group.group_id} group={group} />
                              ))}
                            </Accordion>
                          </div>
                        </AccordionContent>
                      )}
                    </Card>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 border-t border-border bg-muted/50 px-8 pt-4 pb-6 sm:justify-end">
          <DialogClose
            render={
              <Button className="cursor-pointer">Close Details</Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
