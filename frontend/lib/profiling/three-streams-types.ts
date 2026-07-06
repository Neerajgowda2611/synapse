export type StreamIcon = "briefcase" | "rocket" | "messages-square"

export interface Stream {
  id: string
  label: string
  subtitle: string
  icon: StreamIcon
  contributes: string[]
  activities_we_consider: string[]
  what_activities_show: string[]
  recent_highlights: string[]
}

export interface ThreeStreamsResponse {
  title: string
  streams: Stream[]
}
