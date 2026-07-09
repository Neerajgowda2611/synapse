"use client"

import { useEffect, useState } from "react"
import { ThreeStreamsView } from "@/components/portal/three-streams-view"
import { Skeleton } from "@/components/ui/skeleton"
import { listUserStreamActivity } from "@/lib/api/profiler"
import { usePortalUser } from "@/contexts/portal-user-context"
import { mapThreeStreamsFromActivity } from "@/lib/profiling/mappers"
import type { ThreeStreamsResponse } from "@/lib/profiling/three-streams-types"

export default function ThreeStreamsPage() {
  const { userId } = usePortalUser()
  const [data, setData] = useState<ThreeStreamsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: activity } = await listUserStreamActivity(userId)

        if (!cancelled) {
          setData(mapThreeStreamsFromActivity(activity))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load streams.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">{error}</p>
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
