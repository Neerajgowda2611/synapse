"use client"

import { useEffect, useState } from "react"

import {
  DataSource,
  DataSourceEntity,
  SchemaSnapshot,
  SyncJob,
  getCredentials,
  getDataSource,
  getLatestSyncJob,
  getSchema,
  listEntities,
  listObservations,
  listRawRecords,
} from "@/lib/api/data-sources"
import type { SetupProgress } from "@/lib/admin/setup-steps"

export type DataSourceProgressState = {
  dataSource: DataSource | null
  progress: SetupProgress
  syncJob: SyncJob | null
  schema: SchemaSnapshot | null
  entities: DataSourceEntity[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const EMPTY_PROGRESS: SetupProgress = {
  hasCredentials: false,
  hasSchema: false,
  mappedCount: 0,
  totalSources: 0,
  hasData: false,
}

export function useDataSourceProgress(dataSourceId: string, enabled = true): DataSourceProgressState {
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [progress, setProgress] = useState<SetupProgress>(EMPTY_PROGRESS)
  const [syncJob, setSyncJob] = useState<SyncJob | null>(null)
  const [schema, setSchema] = useState<SchemaSnapshot | null>(null)
  const [entities, setEntities] = useState<DataSourceEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!enabled) return
    setLoading(true)
    setError(null)

    try {
      const ds = await getDataSource(dataSourceId)
      setDataSource(ds)

      const isWebhook = ds.connector_definition?.slug === "webhook"

      const [credsResult, schemaResult, entitiesResult, syncResult, dataProbe] = await Promise.all([
        getCredentials(dataSourceId).catch(() => null),
        getSchema(dataSourceId).catch(() => null),
        listEntities(dataSourceId).catch(() => ({ data: [] as DataSourceEntity[] })),
        isWebhook ? Promise.resolve(null) : getLatestSyncJob(dataSourceId).catch(() => null),
        isWebhook
          ? listObservations(dataSourceId, { limit: 1, offset: 0 }).catch(() => null)
          : listRawRecords(dataSourceId, { limit: 1, offset: 0 }).catch(() => null),
      ])

      const entityRows = entitiesResult.data ?? []
      const schemaTables = schemaResult?.schema_json.tables ?? []
      const tableNames = new Set([
        ...schemaTables.map((t) => t.name),
        ...entityRows.map((e) => e.source_name),
      ])

      const mappedCount = entityRows.filter((e) => e.target_domain).length

      setSchema(schemaResult)
      setEntities(entityRows)
      setSyncJob(syncResult?.data ?? null)
      setProgress({
        hasCredentials: Boolean(credsResult),
        hasSchema: schemaTables.length > 0,
        mappedCount,
        totalSources: tableNames.size,
        hasData: Boolean(dataProbe && (dataProbe.total ?? 0) > 0),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data source")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [dataSourceId, enabled])

  return {
    dataSource,
    progress,
    syncJob,
    schema,
    entities,
    loading,
    error,
    refresh: load,
  }
}
