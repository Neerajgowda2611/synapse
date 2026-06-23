import { api } from "@/lib/api/client"
import { appConfig } from "@/lib/config"

export interface ConnectorDefinition {
  id: string
  name: string
  slug: string
  type: string
  version: string
}

export interface DataSource {
  id: string
  institution_id: string
  connector_definition_id: string
  name: string
  status: string
  raw_storage_consent_at?: string
  raw_storage_consented_by?: string
  last_sync_at?: string
  connector_definition?: ConnectorDefinition
}

export interface SyncJob {
  id: string
  data_source_id: string
  status: string
  records_processed: number
  records_failed: number
  started_at?: string
  completed_at?: string
  error_message?: string
  created_at: string
}

export interface MeResponse {
  email: string
  role: string
  user_type: string
  institution_id?: string
}

export interface SchemaColumn {
  name: string
  type: string
}

export interface SchemaTable {
  name: string
  columns: SchemaColumn[]
}

export interface SchemaSnapshot {
  id: string
  version: number
  schema_json: {
    tables: SchemaTable[]
  }
}

export interface DataSourceEntity {
  id: string
  source_name: string
  source_type: string
  target_domain?: string
}

export const targetDomains = [
  "identity",
  "education",
  "attendance",
  "assessments",
  "payments",
  "skills",
  "certifications",
  "projects",
  "placement",
]

export function getMe() {
  return api.get<MeResponse>("/api/v1/auth/me")
}

export function listConnectors() {
  return api.get<{ data: ConnectorDefinition[] }>("/api/v1/connectors")
}

export function listDataSources(institutionID: string) {
  return api.get<{ data: DataSource[] }>(`/api/v1/data-sources?institution_id=${institutionID}`)
}

export function getDataSource(id: string) {
  return api.get<DataSource>(`/api/v1/data-sources/${id}`)
}

export function createDataSource(body: {
  institution_id: string
  connector_definition_id: string
  name: string
}) {
  return api.post<DataSource>("/api/v1/data-sources", body)
}

export interface PostgresCredentials {
  host: string
  port: number
  database: string
  username: string
  password: string
  sslmode: string
  schema: string
}

export interface WebhookCredentials {
  ingest_token: string
}

export type CredentialsResponse = PostgresCredentials | WebhookCredentials

export function isWebhookCredentials(
  creds: CredentialsResponse
): creds is WebhookCredentials {
  return "ingest_token" in creds
}

export function getCredentials(id: string) {
  return api.get<CredentialsResponse>(`/api/v1/data-sources/${id}/credentials`)
}

export function storeCredentials(
  id: string,
  body: {
    host?: string
    port?: number
    database?: string
    username?: string
    password?: string
    sslmode?: string
    schema?: string
    raw_storage_consent: boolean
  }
) {
  return api.put<{ configured: boolean }>(`/api/v1/data-sources/${id}/credentials`, body)
}

export function generateWebhookCredentials(id: string, rawStorageConsent: boolean) {
  return api.put<{ configured: boolean }>(`/api/v1/data-sources/${id}/credentials`, {
    raw_storage_consent: rawStorageConsent,
  })
}

export function webhookIngestURL(token: string) {
  return `${appConfig.apiUrl}/api/v1/webhooks/ingest/${token}`
}

export function testConnection(id: string) {
  return api.post<{ success: boolean; error?: string }>(`/api/v1/data-sources/${id}/test`, {})
}

export function discoverSchema(id: string) {
  return api.post<SchemaSnapshot>(`/api/v1/data-sources/${id}/discover`, {})
}

export function getSchema(id: string) {
  return api.get<SchemaSnapshot>(`/api/v1/data-sources/${id}/schema`)
}

export function listEntities(id: string) {
  return api.get<{ data: DataSourceEntity[] }>(`/api/v1/data-sources/${id}/entities`)
}

export function saveEntities(
  id: string,
  entities: Array<{ source_name: string; target_domain?: string }>
) {
  return api.put<{ data: DataSourceEntity[] }>(`/api/v1/data-sources/${id}/entities`, {
    entities,
  })
}

export interface RawRecord {
  id: string
  institution_id: string
  data_source_id: string
  entity_type: string
  external_id?: string
  payload: Record<string, unknown>
  created_at: string
}

export interface Observation {
  id: string
  data_source_id: string
  source_id: string
  idempotency_key: string
  source_connector: string
  source_event_type: string
  ingestion_altitude: string
  occurred_at: string
  received_at: string
  payload: Record<string, unknown>
  payload_schema?: string
  description?: string
  status: string
  observation_type?: string
  domain?: string
  binding_id?: string
  binding_version?: string
  quarantine_reason?: string
  created_at: string
}

export interface EntityTypeCount {
  entity_type: string
  count: number
}

export interface SourceEventTypeCount {
  source_event_type: string
  count: number
}

export interface RawRecordsResponse {
  data: RawRecord[]
  total: number
  limit: number
  offset: number
  by_entity_type: EntityTypeCount[]
}

export interface ObservationsResponse {
  data: Observation[]
  total: number
  limit: number
  offset: number
  by_source_event_type: SourceEventTypeCount[]
}

export function listRawRecords(
  id: string,
  params?: { limit?: number; offset?: number; entity_type?: string }
) {
  const search = new URLSearchParams()
  if (params?.limit) search.set("limit", String(params.limit))
  if (params?.offset) search.set("offset", String(params.offset))
  if (params?.entity_type) search.set("entity_type", params.entity_type)
  const query = search.toString()
  return api.get<RawRecordsResponse>(
    `/api/v1/data-sources/${id}/records${query ? `?${query}` : ""}`
  )
}

export function listObservations(
  id: string,
  params?: { limit?: number; offset?: number; source_event_type?: string }
) {
  const search = new URLSearchParams()
  if (params?.limit) search.set("limit", String(params.limit))
  if (params?.offset) search.set("offset", String(params.offset))
  if (params?.source_event_type) search.set("source_event_type", params.source_event_type)
  const query = search.toString()
  return api.get<ObservationsResponse>(
    `/api/v1/data-sources/${id}/observations${query ? `?${query}` : ""}`
  )
}

export function getLatestSyncJob(id: string) {
  return api.get<{ data: SyncJob | null }>(`/api/v1/data-sources/${id}/sync-jobs/latest`)
}

export function listSyncJobs(id: string, limit = 20) {
  return api.get<{ data: SyncJob[] }>(`/api/v1/data-sources/${id}/sync-jobs?limit=${limit}`)
}
