"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { Alert } from "@/components/admin/alert"
import { DataSourceWorkspace } from "@/components/admin/data-sources/data-source-workspace"
import { LoadingState } from "@/components/admin/loading-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SchemaSnapshot, getSchema } from "@/lib/api/data-sources"

export default function SchemaExplorerPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { loading: authLoading } = useAdminAuth()
  const [snapshot, setSnapshot] = useState<SchemaSnapshot | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    getSchema(id)
      .then(setSnapshot)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load schema")
      })
      .finally(() => setLoading(false))
  }, [authLoading, id])

  if (authLoading || loading) {
    return <LoadingState label="Loading schema..." />
  }

  const tables = snapshot?.schema_json.tables ?? []

  return (
    <DataSourceWorkspace
      dataSourceId={id}
      title="Schema explorer"
      description={`Snapshot v${snapshot?.version ?? "—"} · ${tables.length} ${tables.length === 1 ? "entity" : "entities"} discovered`}
      breadcrumbLabel="Schema"
      showSetupSteps
      action={
        <Button onClick={() => router.push(`/admin/data-sources/${id}/entities`)}>
          Map entities
        </Button>
      }
    >
      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : tables.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No schema snapshot found. Run discovery from the setup tab.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push(`/admin/data-sources/${id}`)}
            >
              Back to setup
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <Accordion>
              {tables.map((table) => (
                <AccordionItem key={table.name} value={table.name}>
                  <AccordionTrigger className="px-1 hover:no-underline">
                    <div className="text-left">
                      <p className="font-medium">{table.name}</p>
                      <p className="text-xs font-normal text-muted-foreground">
                        {table.columns.length} fields
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-1">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.columns.map((column) => (
                          <TableRow key={column.name}>
                            <TableCell className="font-mono text-xs">{column.name}</TableCell>
                            <TableCell className="text-muted-foreground">{column.type}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </DataSourceWorkspace>
  )
}
