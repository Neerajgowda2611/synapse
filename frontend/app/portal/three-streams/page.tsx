"use client"

import { useEffect, useState } from "react"
import { ThreeStreamsView } from "@/components/portal/three-streams-view"
import { getThreeStreams } from "@/lib/api/three-streams"
import type { ThreeStreamsResponse } from "@/lib/profiling/three-streams-types"

export default function ThreeStreamsPage() {
  const [data, setData] = useState<ThreeStreamsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getThreeStreams()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading streams...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Unable to load streams.</p>
      </div>
    )
  }

  return <ThreeStreamsView data={data} />
}
