export type StreamIcon = "briefcase" | "rocket" | "messages-square"

export interface StreamActivityEvent {
  id: string
  connector: string
  observation_type: string
  label: string
  detail?: string
  occurred_at: string
  received_at?: string
}

export interface StreamTypeCount {
  observation_type: string
  label: string
  count: number
}

export interface StreamTraitLink {
  trait: string
  name: string
  score: number
  evidence_count: number
}

export interface Stream {
  id: string
  label: string
  subtitle: string
  icon: StreamIcon
  /** Educational copy — what this stream generally contributes */
  contributes: string[]
  activities_we_consider: string[]
  what_activities_show: string[]
  /** Aggregated highlight strings (legacy / summary chips) */
  recent_highlights: string[]
  /** Real observation count for this stream */
  activity_count: number
  /** Distinct observation types seen */
  type_counts: StreamTypeCount[]
  /** Recent events newest-first */
  recent_events: StreamActivityEvent[]
  /** Traits with scores that this stream commonly feeds */
  linked_traits: StreamTraitLink[]
}

export interface ThreeStreamsResponse {
  title: string
  subtitle?: string
  streams: Stream[]
  /** Cross-stream recent activity newest-first */
  recent_activity: StreamActivityEvent[]
  /** Current trait scores for "how scoring works" */
  traits: StreamTraitLink[]
}
