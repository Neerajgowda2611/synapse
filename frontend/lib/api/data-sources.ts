import { api } from "@/lib/api/client"

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

export interface CredentialsResponse {
  host: string
  port: number
  database: string
  username: string
  password: string
  sslmode: string
  schema: string
}

export function getCredentials(id: string) {
  return api.get<CredentialsResponse>(`/api/v1/data-sources/${id}/credentials`)
}

export function storeCredentials(
  id: string,
  body: {
    host: string
    port: number
    database: string
    username: string
    password: string
    sslmode?: string
    schema?: string
  }
) {
  return api.put<{ configured: boolean }>(`/api/v1/data-sources/${id}/credentials`, body)
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
