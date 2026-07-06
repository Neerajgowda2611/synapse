import threeStreams from "@/data/three-streams.json"
import type { ThreeStreamsResponse } from "@/lib/profiling/three-streams-types"

export async function getThreeStreams(): Promise<ThreeStreamsResponse> {
  return threeStreams as ThreeStreamsResponse
}
