import learnerPlayerCard from "@/data/learner-player-card.json"
import type { PlayerCardResponse } from "@/lib/profiling/types"

export async function getLearnerPlayerCard(): Promise<PlayerCardResponse> {
  return learnerPlayerCard as PlayerCardResponse
}
