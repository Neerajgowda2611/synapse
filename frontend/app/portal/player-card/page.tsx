"use client"

import { useEffect, useState } from "react"
import { PlayerCardView } from "@/components/portal/player-card-view"
import { getLearnerPlayerCard } from "@/lib/api/learner-profile"
import type { PlayerCardResponse } from "@/lib/profiling/types"

export default function PlayerCardPage() {
  const [data, setData] = useState<PlayerCardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLearnerPlayerCard()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Unable to load profile.</p>
      </div>
    )
  }

  return <PlayerCardView data={data} />
}
