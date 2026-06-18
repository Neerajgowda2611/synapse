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
  connector_definition?: ConnectorDefinition
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
  }
) {
  return api.put<{ configured: boolean }>(`/api/v1/data-sources/${id}/credentials`, body)
}

export function generateWebhookCredentials(id: string) {
  return api.put<{ configured: boolean }>(`/api/v1/data-sources/${id}/credentials`, {})
}

export function webhookIngestURL(token: string, entityType?: string) {
  const base = `${appConfig.apiUrl}/api/v1/webhooks/ingest/${token}`
  return entityType ? `${base}/${entityType}` : base
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

export interface EntityTypeCount {
  entity_type: string
  count: number
}

export interface RawRecordsResponse {
  data: RawRecord[]
  total: number
  limit: number
  offset: number
  by_entity_type: EntityTypeCount[]
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
