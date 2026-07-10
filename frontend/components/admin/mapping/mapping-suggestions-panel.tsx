"use client"

import { Loader2, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MappingSuggestion } from "@/lib/admin/mapping-suggestions"
import { acceptedMappingClass, confidenceTextClass } from "@/lib/ui/status-tones"
import { cn } from "@/lib/utils"

type MappingSuggestionsPanelProps = {
  suggestions: MappingSuggestion[]
  accepted: Set<string>
  onAccept: (id: string) => void
  onAcceptAll: () => void
}

export function MappingSuggestionsPanel({
  suggestions,
  accepted,
  onAccept,
  onAcceptAll,
}: MappingSuggestionsPanelProps) {
  if (suggestions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Discover schema first to generate AI mapping suggestions from column names.
        </CardContent>
      </Card>
    )
  }

  const pending = suggestions.filter((item) => !accepted.has(item.id))

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-chart-2" aria-hidden />
            AI mapping suggestions
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Heuristic recommendations until the mapping API ships. Review before accepting.
          </p>
        </div>
        {pending.length > 0 ? (
          <Button type="button" size="sm" variant="outline" onClick={onAcceptAll}>
            Accept all ({pending.length})
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => {
          const isAccepted = accepted.has(suggestion.id)
          return (
            <div
              key={suggestion.id}
              className={cn("rounded-xl border px-4 py-3", acceptedMappingClass(isAccepted))}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-xs">{suggestion.sourceField}</code>
                    <span className="text-xs text-muted-foreground">→</span>
                    <code className="text-xs text-muted-foreground">{suggestion.targetField}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">{suggestion.rationale}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      confidenceTextClass(suggestion.confidence)
                    )}
                  >
                    {suggestion.confidence}%
                  </span>
                  {isAccepted ? (
                    <Badge variant="outline" className="font-normal">
                      Accepted
                    </Badge>
                  ) : (
                    <Button type="button" size="sm" onClick={() => onAccept(suggestion.id)}>
                      Accept
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5" aria-hidden />
          Confidence scores are preview-only and will be replaced by the AI analyst service.
        </p>
      </CardContent>
    </Card>
  )
}
