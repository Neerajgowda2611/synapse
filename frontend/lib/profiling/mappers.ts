import type {
  JobFitResponse,
  JobWithCriteria,
  StreamActivityObservation,
  TraitEvidenceResponse,
  UserTraitSummary,
} from "@/lib/api/profiler"
import type { CareerDiscoveryResponse } from "@/lib/profiling/career-discovery-types"
import { mapJobFitBreakdown } from "@/lib/profiling/job-fit-breakdown"
import type { CompetencyEvidence, EvidenceGroup, EvidenceItem } from "@/lib/profiling/evidence-types"
import {
  formatObservationTypeLabel,
  formatObservationTypePlural,
  observationItemDetail,
  observationItemText,
} from "@/lib/profiling/evidence-labels"
import type { PlayerCardViewData } from "@/lib/profiling/types"
import type {
  Stream,
  StreamActivityEvent,
  StreamIcon,
  StreamTraitLink,
  StreamTypeCount,
  ThreeStreamsResponse,
} from "@/lib/profiling/three-streams-types"

const CONNECTOR_TO_STREAM: Record<string, string> = {
  vtu_placements: "vtu",
  vtu: "vtu",
  placement: "vtu",
  projex: "projex",
  mentorship: "mentorship",
  shipx: "mentorship",
  ship_ee: "mentorship",
}

const STREAM_STATIC: Record<
  string,
  {
    label: string
    subtitle: string
    icon: StreamIcon
    contributes: string[]
    activities_we_consider: string[]
    what_activities_show: string[]
  }
> = {
  vtu: {
    label: "Placement",
    subtitle: "Career Profile",
    icon: "briefcase",
    contributes: ["Professional Profile", "Readiness", "Technical Skills"],
    activities_we_consider: [
      "Skills",
      "Certificates",
      "Work Experience",
      "Job Applications",
      "Interviews",
      "Offers Received",
    ],
    what_activities_show: ["Career Ready", "Professionalism", "Technical Skills"],
  },
  projex: {
    label: "Projex",
    subtitle: "Project Experience",
    icon: "rocket",
    contributes: ["Teamwork", "Project Delivery", "Ownership"],
    activities_we_consider: [
      "Project",
      "Tasks Completed",
      "Milestones Submitted",
      "Evaluations",
      "Team Contributions",
      "Feedback",
    ],
    what_activities_show: ["Reliability", "Collaboration", "Project Ownership"],
  },
  mentorship: {
    label: "Mentorship",
    subtitle: "Growth & Guidance",
    icon: "messages-square",
    contributes: ["Continuous Learning", "Guidance", "Personal Growth"],
    activities_we_consider: [
      "Sessions Attended",
      "Mentor Feedback",
      "Learning Tasks",
      "Notes Added",
      "Messages Exchanged",
    ],
    what_activities_show: ["Learning Mindset", "Consistency", "Growth"],
  },
}

/** Traits each stream typically feeds (aligned with construct source apps). */
const STREAM_TRAIT_KEYS: Record<string, string[]> = {
  vtu: ["conscientiousness", "agency", "communication", "risk_appetite"],
  projex: ["collaboration", "agency", "conscientiousness", "creativity", "resilience"],
  mentorship: ["help_seeking", "communication", "resilience", "collaboration"],
}

const HIGHLIGHT_RULES: Array<{
  streamId: string
  match: (type: string) => boolean
  label: (count: number) => string
}> = [
  {
    streamId: "vtu",
    match: (t) => t.includes("certificate"),
    label: (n) => `${n} Certificate${n === 1 ? "" : "s"} Added`,
  },
  {
    streamId: "vtu",
    match: (t) => t.includes("job") && t.includes("appl"),
    label: (n) => `${n} Job${n === 1 ? "" : "s"} Applied`,
  },
  {
    streamId: "vtu",
    match: (t) => t.includes("interview"),
    label: (n) => `${n} Interview Call${n === 1 ? "" : "s"}`,
  },
  {
    streamId: "vtu",
    match: (t) => t.includes("offer"),
    label: (n) => `${n} Offer${n === 1 ? "" : "s"} Received`,
  },
  {
    streamId: "projex",
    match: (t) => t.includes("task"),
    label: (n) => `${n} Task${n === 1 ? "" : "s"} Completed`,
  },
  {
    streamId: "projex",
    match: (t) => t.includes("milestone"),
    label: (n) => `${n} Milestone${n === 1 ? "" : "s"} Delivered`,
  },
  {
    streamId: "projex",
    match: (t) => t.includes("feedback"),
    label: (n) => `${n} Peer Feedback Received`,
  },
  {
    streamId: "mentorship",
    match: (t) => t.includes("session") || t.includes("mentoring"),
    label: (n) => `${n} Mentoring Session${n === 1 ? "" : "s"}`,
  },
  {
    streamId: "mentorship",
    match: (t) => t.includes("mentor") && t.includes("task"),
    label: (n) => `${n} Mentor Task${n === 1 ? "" : "s"} Completed`,
  },
  {
    streamId: "mentorship",
    match: (t) => t.includes("note"),
    label: (n) => `${n} Learning Note${n === 1 ? "" : "s"} Added`,
  },
]

export function formatTraitName(trait: string): string {
  return trait
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function formatConnectorLabel(connector: string): string {
  return connector
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function formatRewardSystemId(id: string): string {
  return id.replace(/_/g, " ").toUpperCase()
}

export function matchLabelFromPercent(percent: number): string {
  if (percent >= 80) return "HIGH MATCH"
  if (percent >= 60) return "MEDIUM MATCH"
  return "LOW MATCH"
}

export function buildSourceLabelMap(
  evidenceList: TraitEvidenceResponse[]
): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const evidence of evidenceList) {
    for (const app of evidence.construct?.source_apps ?? []) {
      labels[app] = formatConnectorLabel(app)
    }
    for (const signal of evidence.signals) {
      for (const obs of signal.canonical_observations) {
        labels[obs.source.connector] = formatConnectorLabel(obs.source.connector)
      }
    }
  }
  return labels
}

export function traitPercent(value: number): number {
  return Math.round(value * 100)
}

function weightLabelFromFit(
  weight: number,
  traits: JobFitResponse["traits"]
): "High" | "Medium" | "Low" {
  const maxWeight = Math.max(...traits.map((t) => t.weight), 0)
  if (maxWeight <= 0) return "Low"
  const ratio = weight / maxWeight
  if (ratio >= 0.85) return "High"
  if (ratio >= 0.55) return "Medium"
  return "Low"
}

export function mapRoleFromJobFit(
  job: JobWithCriteria,
  fit: JobFitResponse
): PlayerCardViewData["roles"][number] {
  return {
    id: job.id,
    title: job.title,
    focus: job.criteria.label,
    fitPercent: Math.round(fit.fit_percent),
    competencies: fit.traits
      .map((traitReading) => ({
        trait: traitReading.trait,
        name: formatTraitName(traitReading.trait),
        score: traitPercent(traitReading.trait_value),
        verified: traitReading.usable && !traitReading.missing,
        weight: traitReading.weight,
        weightLabel: weightLabelFromFit(traitReading.weight, fit.traits),
        roleWeightPct:
          fit.weight_sum > 0
            ? Math.round((traitReading.weight / fit.weight_sum) * 1000) / 10
            : 0,
        matchPoints:
          fit.weight_sum > 0
            ? Math.round((traitReading.contribution / fit.weight_sum) * 1000) / 10
            : 0,
        missing: traitReading.missing,
        sourceIds: [],
      }))
      .sort((a, b) => b.matchPoints - a.matchPoints),
    fitBreakdown: mapJobFitBreakdown(fit),
  }
}

export function mapPlayerCard(
  jobs: JobWithCriteria[],
  fitsByJobId: Record<string, JobFitResponse>
): PlayerCardViewData {
  return {
    roles: jobs.map((job) => mapRoleFromJobFit(job, fitsByJobId[job.id])),
    sourceLabels: {},
  }
}

function discoverDescription(job: JobWithCriteria, fit: JobFitResponse): string {
  if (fit.missing_traits.length > 0) {
    const missing = fit.missing_traits.map(formatTraitName).join(", ")
    return `Your profile is still developing for ${missing}. Strengthening these areas would improve fit for ${job.title}.`
  }

  return `Your trait profile aligns with the ${job.criteria.label} criteria for this role.`
}

export function mapCareerDiscovery(
  jobs: JobWithCriteria[],
  fits: JobFitResponse[]
): CareerDiscoveryResponse {
  const fitByJobId = Object.fromEntries(fits.map((f) => [f.job_id, f]))

  return {
    title: "Career Discovery",
    subtitle: `${jobs.length} target role${jobs.length === 1 ? "" : "s"} identified based on your current skill matrix.`,
    sort: {
      label: "Sort by",
      default_option_id: "match_score",
      options: [
        { id: "match_score", label: "Match Score" },
        { id: "role_title", label: "Role Title" },
      ],
    },
    add_to_profile_label: "Add To profile",
    roles: jobs.map((job) => {
      const fit = fitByJobId[job.id]
      const matchScore = Math.round(fit?.fit_percent ?? 0)
      const skills = job.criteria.metrics
        .map((m) => m.trait ?? m.metric_id)
        .filter(Boolean)
        .map((s) => s.replace(/_/g, " ").toUpperCase())

      return {
        id: job.id,
        category: job.company_name ?? formatRewardSystemId(job.reward_system_id),
        title: job.title,
        company_name: job.company_name,
        subtitle: job.subtitle,
        external_url: job.external_url,
        skills,
        description: fit
          ? discoverDescription(job, fit)
          : `Explore how your profile aligns with ${job.title}.`,
        match_score: matchScore,
        match_label: matchLabelFromPercent(matchScore),
        fit_breakdown: fit ? mapJobFitBreakdown(fit) : undefined,
      }
    }),
  }
}

function streamIdForConnector(connector: string): string | undefined {
  const normalized = connector.toLowerCase()
  if (CONNECTOR_TO_STREAM[normalized]) return CONNECTOR_TO_STREAM[normalized]
  for (const [key, streamId] of Object.entries(CONNECTOR_TO_STREAM)) {
    if (normalized.includes(key)) return streamId
  }
  return undefined
}

function eventSortTime(event: { occurred_at?: string; received_at?: string }) {
  const raw = event.received_at || event.occurred_at || ""
  const time = new Date(raw).getTime()
  return Number.isNaN(time) ? 0 : time
}

function toStreamEvent(obs: StreamActivityObservation): StreamActivityEvent | null {
  if (!obs.connector || !obs.observation_type) return null
  const fields = obs.fields ?? {}
  return {
    id: obs.id || `${obs.connector}:${obs.observation_type}:${obs.occurred_at}`,
    connector: obs.connector,
    observation_type: obs.observation_type,
    label: formatObservationTypeLabel(obs.observation_type),
    detail: observationItemDetail(obs.observation_type, fields) ?? undefined,
    occurred_at: obs.occurred_at,
    received_at: obs.received_at,
  }
}

function aggregateHighlightsFromActivity(
  observations: Array<{ connector: string; observation_type: string }>
): Record<string, string[]> {
  const counts: Record<string, Record<string, number>> = {
    vtu: {},
    projex: {},
    mentorship: {},
  }

  for (const obs of observations) {
    const streamId = streamIdForConnector(obs.connector)
    if (!streamId) continue
    const type = obs.observation_type.toLowerCase()
    for (const rule of HIGHLIGHT_RULES) {
      if (rule.streamId !== streamId || !rule.match(type)) continue
      const key = rule.label(0)
      counts[streamId][key] = (counts[streamId][key] ?? 0) + 1
    }
  }

  const highlights: Record<string, string[]> = {}
  for (const streamId of Object.keys(STREAM_STATIC)) {
    const streamCounts = counts[streamId] ?? {}
    highlights[streamId] = HIGHLIGHT_RULES.filter((r) => r.streamId === streamId)
      .map((rule) => {
        const key = rule.label(0)
        const count = streamCounts[key]
        return count ? rule.label(count) : null
      })
      .filter((h): h is string => h !== null)
  }

  return highlights
}

function traitLinksFromSummaries(traits: UserTraitSummary[]): StreamTraitLink[] {
  return traits
    .map((trait) => ({
      trait: trait.trait,
      name: formatTraitName(trait.trait),
      score: traitPercent(trait.value),
      evidence_count: trait.evidence?.n_observations ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

function buildTypeCounts(events: StreamActivityEvent[]): StreamTypeCount[] {
  const counts = new Map<string, number>()
  for (const event of events) {
    counts.set(event.observation_type, (counts.get(event.observation_type) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([observation_type, count]) => ({
      observation_type,
      label: formatObservationTypeLabel(observation_type),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function mapThreeStreamsFromActivity(
  observations: StreamActivityObservation[],
  traits: UserTraitSummary[] = []
): ThreeStreamsResponse {
  const highlights = aggregateHighlightsFromActivity(observations)
  const traitLinks = traitLinksFromSummaries(traits)
  const traitByKey = new Map(traitLinks.map((t) => [t.trait, t]))

  const eventsByStream: Record<string, StreamActivityEvent[]> = {
    vtu: [],
    projex: [],
    mentorship: [],
  }

  const allEvents: StreamActivityEvent[] = []
  for (const obs of observations) {
    const event = toStreamEvent(obs)
    if (!event) continue
    allEvents.push(event)
    const streamId = streamIdForConnector(obs.connector)
    if (streamId && eventsByStream[streamId]) {
      eventsByStream[streamId].push(event)
    }
  }

  allEvents.sort((a, b) => eventSortTime(b) - eventSortTime(a))
  for (const streamId of Object.keys(eventsByStream)) {
    eventsByStream[streamId].sort((a, b) => eventSortTime(b) - eventSortTime(a))
  }

  const streams: Stream[] = Object.entries(STREAM_STATIC).map(([id, config]) => {
    const recent_events = eventsByStream[id] ?? []
    const linked_traits = (STREAM_TRAIT_KEYS[id] ?? [])
      .map((trait) => traitByKey.get(trait))
      .filter((t): t is StreamTraitLink => Boolean(t))

    return {
      id,
      label: config.label,
      subtitle: config.subtitle,
      icon: config.icon,
      contributes: config.contributes,
      activities_we_consider: config.activities_we_consider,
      what_activities_show: config.what_activities_show,
      recent_highlights: highlights[id] ?? [],
      activity_count: recent_events.length,
      type_counts: buildTypeCounts(recent_events),
      recent_events: recent_events.slice(0, 25),
      linked_traits,
    }
  })

  return {
    title: "How Your Profile Is Built",
    subtitle:
      "Live activity from Placement, Projex, and Mentorship — and how it feeds your trait scores.",
    streams,
    recent_activity: allEvents.slice(0, 20),
    traits: traitLinks,
  }
}

export function mapThreeStreams(
  evidenceList: TraitEvidenceResponse[],
  traits: UserTraitSummary[] = []
): ThreeStreamsResponse {
  const observations: StreamActivityObservation[] = []
  for (const evidence of evidenceList) {
    for (const signal of evidence.signals) {
      for (const obs of signal.canonical_observations) {
        observations.push({
          id: obs.id,
          connector: obs.source.connector,
          observation_type: obs.observation_type,
          occurred_at: obs.occurred_at,
          received_at: obs.source.received_at,
          fields: obs.fields,
        })
      }
    }
  }
  if (traits.length === 0) {
    traits = evidenceList.map((e) => ({
      trait: e.trait,
      value: e.value,
      confidence: e.confidence,
      evidence: e.evidence,
      as_of: e.as_of,
    }))
  }
  return mapThreeStreamsFromActivity(observations, traits)
}

export function mapTraitEvidenceToDialog(
  evidence: TraitEvidenceResponse
): CompetencyEvidence {
  const byConnector = new Map<
    string,
    {
      byObservationType: Map<string, EvidenceItem[]>
      nObservations: number
    }
  >()

  for (const signal of evidence.signals) {
    for (const obs of signal.canonical_observations) {
      const connector = obs.source.connector
      const entry = byConnector.get(connector) ?? {
        byObservationType: new Map<string, EvidenceItem[]>(),
        nObservations: 0,
      }
      entry.nObservations += 1

      const observationType = obs.observation_type
      const items = entry.byObservationType.get(observationType) ?? []
      const fields = obs.fields ?? {}
      items.push({
        id: obs.id,
        text: observationItemText(observationType, fields, obs.source.payload),
        detail: observationItemDetail(observationType, fields, obs.source.payload),
        occurred_at: obs.occurred_at,
      })
      entry.byObservationType.set(observationType, items)
      byConnector.set(connector, entry)
    }
  }

  const sources = [...byConnector.entries()].map(([connector, data], index) => {
    const groups: EvidenceGroup[] = [...data.byObservationType.entries()]
      .map(([observationType, items]) => ({
        group_id: `${connector}:${observationType}`,
        title: formatObservationTypePlural(observationType, items.length),
        label: formatObservationTypeLabel(observationType),
        count: items.length,
        items,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

    return {
      source_id: connector,
      title: `${formatConnectorLabel(connector)} Activity`,
      stats: [
        { label: `${data.nObservations} activit${data.nObservations === 1 ? "y" : "ies"}` },
        { label: `${groups.length} activity type${groups.length === 1 ? "" : "s"}` },
      ],
      groups,
      default_open: index === 0,
    }
  })

  const latestSignalAt = evidence.signals
    .map((signal) => signal.derived_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

  return {
    description:
      evidence.construct?.definition ??
      evidence.construct?.scientific_rationale ??
      "",
    distinct_signal_types: evidence.evidence.distinct_signal_types,
    n_observations: evidence.evidence.n_observations,
    latest_signal_at: latestSignalAt,
    source: "Native",
    sources,
  }
}
