"use client"

import { useEffect, useState } from "react"
import { listJobs, listUserJobFits } from "@/lib/api/profiler"
import { PlayerCardView } from "@/components/portal/player-card-view"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { usePortalUser } from "@/contexts/portal-user-context"
import { mapPlayerCard } from "@/lib/profiling/mappers"
import type { PlayerCardViewData } from "@/lib/profiling/types"

export default function PlayerCardPage() {
  const { userId } = usePortalUser()
  const [data, setData] = useState<PlayerCardViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [{ data: jobs }, { data: fits }] = await Promise.all([
          listJobs(),
          listUserJobFits(userId),
        ])
        if (jobs.length === 0) {
          if (!cancelled) setData({ roles: [], sourceLabels: {} })
          return
        }

        if (!cancelled) {
          setData(
            mapPlayerCard(
              jobs,
              Object.fromEntries(fits.map((f) => [f.job_id, f]))
            )
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load profile.")
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
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} className="my-8" />
  }

  if (!data) {
    return <ErrorState message="Unable to load profile." className="my-8" />
  }

  return <PlayerCardView data={data} />
}
