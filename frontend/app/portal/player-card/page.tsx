"use client"

import { useEffect, useState } from "react"
import { getUserJobFit, listJobs } from "@/lib/api/profiler"
import { PlayerCardView } from "@/components/portal/player-card-view"
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
        const { data: jobs } = await listJobs()
        if (jobs.length === 0) {
          if (!cancelled) setData({ roles: [], sourceLabels: {} })
          return
        }

        const fits = await Promise.all(
          jobs.map((job) => getUserJobFit(userId, job.id))
        )

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
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading profile...</p>
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
        <p className="text-muted-foreground">Unable to load profile.</p>
      </div>
    )
  }

  return <PlayerCardView data={data} />
}
