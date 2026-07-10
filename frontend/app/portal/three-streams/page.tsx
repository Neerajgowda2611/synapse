"use client"

import { useEffect, useState } from "react"
import { ThreeStreamsView } from "@/components/portal/three-streams-view"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { usePortalUser } from "@/contexts/portal-user-context"
import { loadThreeStreamsData } from "@/lib/profiling/load-three-streams"
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
        const streams = await loadThreeStreamsData(userId)
        if (!cancelled) setData(streams)
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
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Skeleton className="h-72 w-full rounded-xl xl:col-span-8" />
          <Skeleton className="h-72 w-full rounded-xl xl:col-span-4" />
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} className="my-8" />
  }

  if (!data) {
    return <ErrorState message="Unable to load streams." className="my-8" />
  }

  return <ThreeStreamsView data={data} />
}
