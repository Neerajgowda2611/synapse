import { api } from "@/lib/api/client"

export interface InstitutionUser {
  id: string
  user_id: string
  institution_id: string
  name: string
  email: string
  role: string
  status: string
  created_at: string
  updated_at: string
}

export type InstitutionUserRole =
  | "institution_admin"
  | "institution_operator"
  | "institution_viewer"

export function listInstitutionUsers(institutionId: string) {
  return api.get<InstitutionUser[]>(`/api/v1/institutions/${institutionId}/users`)
}

export function createInstitutionUser(
  institutionId: string,
  body: { name: string; email: string; role: InstitutionUserRole }
) {
  return api.post<InstitutionUser>(`/api/v1/institutions/${institutionId}/users`, body)
}
