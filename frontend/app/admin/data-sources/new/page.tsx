"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Alert } from "@/components/admin/alert"
import { ConnectorIcon } from "@/components/admin/connector-icon"
import { LoadingState } from "@/components/admin/loading-state"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  ConnectorDefinition,
  createDataSource,
  listConnectors,
} from "@/lib/api/data-sources"
import { getConnectorMeta } from "@/lib/connector-meta"
import { cn } from "@/lib/utils"

export default function NewDataSourcePage() {
  const router = useRouter()
  const { me, loading: authLoading } = useAdminAuth()
  const [connectors, setConnectors] = useState<ConnectorDefinition[]>([])
  const [name, setName] = useState("")
  const [connectorDefinitionID, setConnectorDefinitionID] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selectedConnector = connectors.find((c) => c.id === connectorDefinitionID)

  useEffect(() => {
    if (authLoading) return

    listConnectors()
      .then((response) => {
        const items = response.data ?? []
        setConnectors(items)
        setConnectorDefinitionID(items[0]?.id ?? "")
      })
      .finally(() => setLoading(false))
  }, [authLoading])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!me?.institution_id) {
      setError("Institution context is missing")
      return
    }

    setSaving(true)
    try {
      const dataSource = await createDataSource({
        institution_id: me.institution_id,
        connector_definition_id: connectorDefinitionID,
        name,
      })
      router.push(`/admin/data-sources/${dataSource.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create data source")
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingState />
  }

  const selectedMeta = getConnectorMeta(selectedConnector?.slug)

  return (
    <>
      <PageHeader
        title="Add data source"
        description="Pick a connector type, name the integration, then configure credentials on the next screen."
        breadcrumbs={[
          { label: "Data sources", href: "/admin" },
          { label: "New" },
        ]}
      />

      <form onSubmit={submit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">1. Choose connector</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {connectors.map((connector) => {
                const meta = getConnectorMeta(connector.slug)
                const selected = connector.id === connectorDefinitionID

                return (
                  <button
                    key={connector.id}
                    type="button"
                    onClick={() => setConnectorDefinitionID(connector.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                      selected
                        ? "border-foreground bg-muted/40 ring-1 ring-foreground"
                        : "border-border bg-card hover:border-border/80"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "rounded-lg border p-2",
                          meta.accentBg,
                          meta.accentBorder,
                          meta.accent
                        )}
                      >
                        <ConnectorIcon slug={connector.slug} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{connector.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{meta.typeLabel}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {meta.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">2. Name this integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={
                selectedConnector?.slug === "webhook"
                  ? "Attendance webhook (n8n)"
                  : "ABC College student database"
              }
            />
            <p className="text-xs text-muted-foreground">
              A label your team will recognize — it does not affect the connection itself.
            </p>
          </CardContent>
        </Card>

        {selectedConnector ? (
          <Card className={cn(selectedMeta.accentBorder, selectedMeta.accentBg)}>
            <CardContent className="py-4 text-sm">
              <p className={cn("font-medium", selectedMeta.accent)}>
                {selectedConnector.slug === "webhook"
                  ? "Next: generate ingest URL"
                  : "Next: add database credentials"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {selectedConnector.slug === "webhook"
                  ? "You will get a URL to POST JSON payloads into Profiler."
                  : "You will enter host, database, and credentials to discover tables."}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/admin")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !connectorDefinitionID || !name.trim()}>
            {saving ? "Creating…" : "Create and continue"}
          </Button>
        </div>
      </form>
    </>
  )
}
