"use client"

import { useEffect, useState } from "react"
import { CareerDiscoveryView } from "@/components/portal/career-discovery-view"
import { ErrorState } from "@/components/ui/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { getUserJobFit, listJobs } from "@/lib/api/profiler"
import { usePortalUser } from "@/contexts/portal-user-context"
import { mapCareerDiscovery } from "@/lib/profiling/mappers"
import type { CareerDiscoveryResponse } from "@/lib/profiling/career-discovery-types"

export default function DiscoverPage() {
  const { userId } = usePortalUser()
  const [data, setData] = useState<CareerDiscoveryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data: jobs } = await listJobs()
        const fits = await Promise.all(jobs.map((job) => getUserJobFit(userId, job.id)))

        if (!cancelled) {
          setData(mapCareerDiscovery(jobs, fits))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load career discovery.")
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
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} className="my-8" />
  }

  if (!data) {
    return <ErrorState message="Unable to load career discovery." className="my-8" />
  }

  return <CareerDiscoveryView data={data} />
}
