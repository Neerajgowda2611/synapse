"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowRight, Lock } from "lucide-react"

import { DataSourceWorkspace } from "@/components/admin/data-sources/data-source-workspace"
import { MappingSuggestionsPanel } from "@/components/admin/mapping/mapping-suggestions-panel"
import { LoadingState } from "@/components/admin/loading-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { buildMappingSuggestions } from "@/lib/admin/mapping-suggestions"
import { SchemaSnapshot, getSchema, targetDomains } from "@/lib/api/data-sources"

export default function FieldMappingPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { loading: authLoading } = useAdminAuth()
  const [snapshot, setSnapshot] = useState<SchemaSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (authLoading) return
    getSchema(id)
      .then(setSnapshot)
      .catch(() => setSnapshot(null))
      .finally(() => setLoading(false))
  }, [authLoading, id])

  const suggestions = useMemo(() => buildMappingSuggestions(snapshot), [snapshot])

  if (authLoading || loading) {
    return <LoadingState label="Loading field mapping..." />
  }

  const sampleFields =
    snapshot?.schema_json.tables.flatMap((table) =>
      table.columns.slice(0, 3).map((col) => `${table.name}.${col.name}`)
    ) ?? []

  const canonicalFields = targetDomains.flatMap((domain) => [
    `${domain}.id`,
    `${domain}.occurred_at`,
    `${domain}.value`,
  ])

  return (
    <DataSourceWorkspace
      dataSourceId={id}
      title="Field mapping"
      description="Map source fields to canonical CPS fields. Saving will be enabled once the mapping API is available."
      breadcrumbLabel="Field mapping"
      showSetupSteps={false}
    >
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 py-4 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">
            Field-level mapping UI is scaffolded for Phase UI-2. Backend endpoints for
            `MappingDefinition` are not exposed yet — review AI suggestions below, then confirm
            pairs in the split editor.
          </p>
        </CardContent>
      </Card>

      <MappingSuggestionsPanel
        suggestions={suggestions}
        accepted={accepted}
        onAccept={(suggestionId) =>
          setAccepted((current) => new Set(current).add(suggestionId))
        }
        onAcceptAll={() =>
          setAccepted(new Set(suggestions.map((suggestion) => suggestion.id)))
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-sm">Source fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sampleFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Discover schema first to preview source fields from your connector.
              </p>
            ) : (
              sampleFields.map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  <code className="text-xs">{field}</code>
                  <Badge variant="outline" className="font-normal">
                    source
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-sm">Canonical CPS fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {canonicalFields.slice(0, 8).map((field) => (
              <div
                key={field}
                className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-sm"
              >
                <code className="text-xs text-muted-foreground">{field}</code>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              Drag-and-drop or select mapping pairs will appear here when the API ships.
            </p>
          </CardContent>
        </Card>
      </div>
    </DataSourceWorkspace>
  )
}
