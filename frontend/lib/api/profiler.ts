import { api, ApiError } from "@/lib/api/client"

export interface ProfilerMeResponse {
  user_id: string
  email: string
  name: string
  user_type: string
  role: string
  institution_id?: string
}

export interface ConfidenceInterval {
  point: number
  lower: number
  upper: number
  level: number
}

export interface EvidenceDensity {
  n_signals: number
  n_effective: number
  distinct_signal_types: number
  n_observations: number
}

export interface JobCriteriaMetric {
  metric_id: string
  trait?: string
  weight: number
  kind: string
  shape: string
  peak?: number
  pole?: string
  components?: Record<string, number>
}

export interface JobRewardCriteria {
  id: string
  label: string
  version: string
  weight_sum: number
  metrics: JobCriteriaMetric[]
}

export interface JobWithCriteria {
  id: string
  title: string
  company_name?: string
  subtitle?: string
  external_url?: string
  reward_system_id: string
  status: string
  criteria: JobRewardCriteria
}

export interface UserTraitSummary {
  trait: string
  value: number
  confidence: ConfidenceInterval
  evidence: EvidenceDensity
  as_of: string
}

export interface JobFitTraitReading {
  trait: string
  metric_id: string
  weight: number
  trait_value: number
  metric_value: number
  usable: boolean
  contribution: number
  missing: boolean
}

export interface JobFitResponse {
  job_id: string
  job_title: string
  reward_system_id: string
  as_of: string
  fit_percent: number
  score: number
  raw_score: number
  weight_sum: number
  confidence: ConfidenceInterval
  suppressed_metrics: string[]
  traits: JobFitTraitReading[]
  missing_traits: string[]
  traits_auto_refreshed: boolean
}

export interface ConstructRegisterEntry {
  construct_id: string
  trait: string
  family: string
  shape: string
  peak?: number
  pole?: string
  name: string
  definition: string
  scientific_rationale: string
  legitimacy_rationale: string
  supporting_signals: string[]
  required_observations: string[]
  source_apps: string[]
  fairness: {
    dif_checked: boolean
    dif_flags: string[]
    known_confounds: string[]
  }
  uncertainty_policy: string
  version: string
}

export interface EvidenceSourceEvent {
  connector: string
  event_type: string
  binding_id: string
  raw_observation_id: string
  occurred_at: string
  received_at: string
  payload?: Record<string, unknown>
}

export interface EvidenceCanonicalObservation {
  id: string
  observation_type: string
  occurred_at: string
  fields: Record<string, unknown>
  source: EvidenceSourceEvent
}

export interface EvidenceSignal {
  signal_id: string
  signal_type: string
  value: number
  derived_at: string
  rule_id: string
  derivation_confidence: number
  canonical_observations: EvidenceCanonicalObservation[]
}

export interface TraitEvidenceResponse {
  trait: string
  value: number
  confidence: ConfidenceInterval
  evidence: EvidenceDensity
  construct?: ConstructRegisterEntry
  claims: unknown[]
  signals: EvidenceSignal[]
  as_of: string
}

export interface RefreshTraitsResponse {
  metric_run_id: string
  as_of: string
  n_traits: number
}

export interface ProjectFitTraitDetail {
  trait: string
  weight: number
  weight_share_percent: number
  trait_percent: number
  fit_percent: number
  contribution_percent: number
  usable: boolean
  missing: boolean
  confidence: ConfidenceInterval
  evidence: EvidenceDensity
}

export interface ProjectFitDetailResponse {
  target_id: string
  target_kind: "project"
  project_name: string
  xint_source_ref: string
  learner: {
    id: string
    name: string
    email: string
  }
  as_of: string
  fit_percent: number
  score: number
  confidence: ConfidenceInterval
  traits: ProjectFitTraitDetail[]
  missing_traits: string[]
}

export function getProfilerMe() {
  return api.get<ProfilerMeResponse>("/api/v1/auth/me")
}

export function getProjectFitDetail(token: string) {
  return api.get<ProjectFitDetailResponse>(
    `/api/v1/project-fit?token=${encodeURIComponent(token)}`
  )
}

export function listJobs() {
  return api.get<{ data: JobWithCriteria[] }>("/api/v1/jobs")
}

export function getJob(jobId: string) {
  return api.get<JobWithCriteria>(`/api/v1/jobs/${jobId}`)
}

export function listUserStreamActivity(userId: string, asOf?: string) {
  const query = asOf ? `?as_of=${encodeURIComponent(asOf)}` : ""
  return api.get<{ data: StreamActivityObservation[]; as_of: string }>(
    `/api/v1/users/${userId}/streams/activity${query}`
  )
}

export async function listUserStreamActivitySafe(userId: string, asOf?: string) {
  try {
    return await listUserStreamActivity(userId, asOf)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export interface StreamActivityObservation {
  connector: string
  observation_type: string
}

export function listUserTraits(userId: string, asOf?: string) {
  const query = asOf ? `?as_of=${encodeURIComponent(asOf)}` : ""
  return api.get<{ data: UserTraitSummary[]; as_of: string }>(
    `/api/v1/users/${userId}/traits${query}`
  )
}

export function refreshUserTraits(userId: string) {
  return api.post<RefreshTraitsResponse>(`/api/v1/users/${userId}/traits/refresh`, {})
}

export function listUserJobFits(userId: string, asOf?: string) {
  const query = asOf ? `?as_of=${encodeURIComponent(asOf)}` : ""
  return api.get<{ data: JobFitResponse[]; as_of: string }>(
    `/api/v1/users/${userId}/jobs/fit${query}`
  )
}

export function getUserJobFit(userId: string, jobId: string) {
  return api.get<JobFitResponse>(`/api/v1/users/${userId}/jobs/${jobId}/fit`)
}

export function getTraitEvidence(userId: string, trait: string) {
  return api.get<TraitEvidenceResponse>(`/api/v1/users/${userId}/traits/${trait}/evidence`)
}

export async function getTraitEvidenceSafe(userId: string, trait: string) {
  try {
    return await getTraitEvidence(userId, trait)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}
