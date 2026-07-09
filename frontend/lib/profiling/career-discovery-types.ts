import type { JobFitBreakdown } from "@/lib/profiling/job-fit-types"

export interface CareerDiscoverySortOption {
  id: string
  label: string
}

export interface CareerDiscoverySort {
  label: string
  default_option_id: string
  options: CareerDiscoverySortOption[]
}

export interface CareerDiscoveryRole {
  id: string
  category: string
  title: string
  company_name?: string
  subtitle?: string
  external_url?: string
  skills: string[]
  description: string
  match_score: number
  match_label: string
  fit_breakdown?: JobFitBreakdown
}

export interface CareerDiscoveryResponse {
  title: string
  subtitle: string
  sort: CareerDiscoverySort
  add_to_profile_label: string
  roles: CareerDiscoveryRole[]
}
