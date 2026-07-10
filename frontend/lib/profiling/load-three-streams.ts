import {
  getTraitEvidenceSafe,
  listUserStreamActivity,
  listUserTraits,
  refreshUserTraits,
} from "@/lib/api/profiler"
import { mapThreeStreams, mapThreeStreamsFromActivity } from "@/lib/profiling/mappers"
import type { ThreeStreamsResponse } from "@/lib/profiling/three-streams-types"

/**
 * Loads three-streams view data. Prefers the lightweight stream-activity API when
 * available, and falls back to trait evidence aggregation so the page still works
 * when the backend route is unavailable or returns no observations yet.
 */
export async function loadThreeStreamsData(userId: string): Promise<ThreeStreamsResponse> {
  try {
    const { data: activity } = await listUserStreamActivity(userId)
    return mapThreeStreamsFromActivity(activity)
  } catch {
    // Stream activity endpoint may be missing on older backends — use legacy path.
  }

  try {
    return await loadThreeStreamsFromTraitEvidence(userId)
  } catch {
    return mapThreeStreamsFromActivity([])
  }
}

async function loadThreeStreamsFromTraitEvidence(userId: string): Promise<ThreeStreamsResponse> {
  let traitsResponse = await listUserTraits(userId)

  if (traitsResponse.data.length === 0) {
    try {
      await refreshUserTraits(userId)
      traitsResponse = await listUserTraits(userId)
    } catch {
      return mapThreeStreamsFromActivity([])
    }
  }

  const evidenceList = (
    await Promise.all(
      traitsResponse.data.map((trait) => getTraitEvidenceSafe(userId, trait.trait))
    )
  ).filter((evidence): evidence is NonNullable<typeof evidence> => evidence !== null)

  return mapThreeStreams(evidenceList)
}
