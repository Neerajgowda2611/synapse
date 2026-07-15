"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { ProgressRing } from "@/components/portal/progress-ring"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { listUserTraits } from "@/lib/api/profiler"
import type { LearnerRow } from "@/lib/admin/load-learners"

type LearnerProfilePreviewProps = {
  learner: LearnerRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LearnerProfilePreview({
  learner,
  open,
  onOpenChange,
}: LearnerProfilePreviewProps) {
  const [loading, setLoading] = useState(false)
  const [traits, setTraits] = useState<Array<{ trait: string; value: number }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !learner?.userId) {
      setTraits([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    listUserTraits(learner.userId)
      .then((response) => {
        setTraits(
          (response.data ?? []).map((item) => ({
            trait: item.trait,
            value: Math.round(item.value * 100),
          }))
        )
      })
      .catch(() => setError("Could not load profile traits for this learner."))
      .finally(() => setLoading(false))
  }, [open, learner?.userId])

  const strength =
    traits.length > 0
      ? Math.round(traits.reduce((sum, trait) => sum + trait.value, 0) / traits.length)
      : learner?.profileStrength ?? 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{learner?.name ?? "Learner profile"}</SheetTitle>
          <SheetDescription>
            {learner?.email ?? learner?.externalId ?? "Preview generated profile signals."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 px-1">
          <div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4">
            <ProgressRing value={strength} size={72} strokeWidth={6}>
              <span className="text-sm font-semibold tabular-nums">{strength}%</span>
            </ProgressRing>
            <div className="space-y-1">
              <p className="text-sm font-medium">Profile strength</p>
              <p className="text-xs text-muted-foreground">
                {traits.length > 0
                  ? `${traits.length} traits with derived signals`
                  : "No trait readings yet"}
              </p>
              {learner?.sourceLabel ? (
                <Badge variant="outline" className="font-normal">
                  {learner.sourceLabel}
                </Badge>
              ) : null}
            </div>
          </div>

          {!learner?.userId ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              This learner has not been linked to a platform user yet. Identity resolution will
              enable full profile preview.
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading trait readings…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive">
              {error}
            </div>
          ) : traits.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Imported records exist, but no derived traits are available yet.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Top traits
              </p>
              {traits
                .sort((a, b) => b.value - a.value)
                .slice(0, 8)
                .map((trait) => (
                  <div key={trait.trait} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{trait.trait.replaceAll("_", " ")}</span>
                      <span className="font-medium tabular-nums">{trait.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-chart-2 transition-all"
                        style={{ width: `${trait.value}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
