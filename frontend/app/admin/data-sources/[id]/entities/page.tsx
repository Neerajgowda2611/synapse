"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { Alert } from "@/components/admin/alert"
import { DataSourceWorkspace } from "@/components/admin/data-sources/data-source-workspace"
import { EntityMappingKpis } from "@/components/admin/data-sources/entity-mapping-kpis"
import { LoadingState } from "@/components/admin/loading-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  DataSourceEntity,
  SchemaSnapshot,
  getSchema,
  listEntities,
  saveEntities,
  targetDomains,
} from "@/lib/api/data-sources"

export default function EntitySelectionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { loading: authLoading } = useAdminAuth()
  const [snapshot, setSnapshot] = useState<SchemaSnapshot | null>(null)
  const [entities, setEntities] = useState<DataSourceEntity[]>([])
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authLoading) return

    Promise.all([getSchema(id), listEntities(id)])
      .then(([schema, entityData]) => {
        setSnapshot(schema)
        setEntities(entityData.data ?? [])
        setSelected(
          Object.fromEntries(
            (entityData.data ?? []).map((entity) => [entity.source_name, entity.target_domain ?? ""])
          )
        )
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load entities")
      })
      .finally(() => setLoading(false))
  }, [authLoading, id])

  const tableNames = useMemo(() => {
    const fromSchema = snapshot?.schema_json.tables.map((table) => table.name) ?? []
    const fromEntities = entities.map((entity) => entity.source_name)
    return Array.from(new Set([...fromSchema, ...fromEntities])).sort()
  }, [entities, snapshot])

  const mappedCount = useMemo(
    () => tableNames.filter((name) => selected[name]).length,
    [selected, tableNames]
  )
  const skippedCount = tableNames.length - mappedCount

  async function submit() {
    setError("")
    setMessage("")
    setSaving(true)
    try {
      await saveEntities(
        id,
        tableNames.map((sourceName) => ({
          source_name: sourceName,
          target_domain: selected[sourceName] || undefined,
        }))
      )
      setMessage(`Saved mappings for ${mappedCount} ${mappedCount === 1 ? "entity" : "entities"}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entities")
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return <LoadingState label="Loading entity mappings..." />
  }

  return (
    <DataSourceWorkspace
      dataSourceId={id}
      title="Map entities"
      description="Assign each source table or event type to a learner profile domain."
      breadcrumbLabel="Entities"
      activeSetupStep="entities"
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push(`/admin/data-sources/${id}/schema`)}>
            View schema
          </Button>
          <Button onClick={submit} disabled={saving || tableNames.length === 0}>
            {saving ? "Saving…" : "Save mappings"}
          </Button>
        </div>
      }
    >
      <EntityMappingKpis total={tableNames.length} mapped={mappedCount} skipped={skippedCount} />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}

      <Card>
        <CardContent className="p-0">
          {tableNames.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">Discover schema before mapping entities.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push(`/admin/data-sources/${id}`)}
              >
                Go to setup
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Profile domain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableNames.map((tableName) => {
                  const mapped = Boolean(selected[tableName])
                  return (
                    <TableRow key={tableName} className={mapped ? "bg-chart-2/5" : undefined}>
                      <TableCell>
                        <p className="font-medium">{tableName}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {mapped ? "Will import" : "Skipped"}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <Select
                          value={selected[tableName] ?? "__skip__"}
                          onValueChange={(value) =>
                            setSelected((current) => ({
                              ...current,
                              [tableName]: value === "__skip__" ? "" : value,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Do not import" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">Do not import</SelectItem>
                            {targetDomains.map((domain) => (
                              <SelectItem key={domain} value={domain}>
                                {domain}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DataSourceWorkspace>
  )
}
