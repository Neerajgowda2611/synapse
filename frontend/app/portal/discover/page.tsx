"use client"

import { useEffect, useState } from "react"
import { CareerDiscoveryView } from "@/components/portal/career-discovery-view"
import {
  getTraitEvidenceSafe,
  getUserJobFit,
  listJobs,
} from "@/lib/api/profiler"
import { usePortalUser } from "@/contexts/portal-user-context"
import { mapCareerDiscovery } from "@/lib/profiling/mappers"
import type { CareerDiscoveryResponse } from "@/lib/profiling/career-discovery-types"
import type { TraitEvidenceResponse } from "@/lib/api/profiler"

async function loadEvidenceForTraits(userId: string, traits: string[]) {
  const entries = await Promise.all(
    traits.map(async (trait) => {
      const evidence = await getTraitEvidenceSafe(userId, trait)
      return evidence ? ([trait, evidence] as const) : null
    })
  )
  return Object.fromEntries(
    entries.filter((e): e is [string, TraitEvidenceResponse] => e !== null)
  )
}

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
        const allTraits = [...new Set(fits.flatMap((fit) => fit.traits.map((t) => t.trait)))]
        const evidenceByTrait = await loadEvidenceForTraits(userId, allTraits)

        if (!cancelled) {
          setData(mapCareerDiscovery(jobs, fits, evidenceByTrait))
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
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading career discovery...</p>
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
        <p className="text-muted-foreground">Unable to load career discovery.</p>
      </div>
    )
  }

  return <CareerDiscoveryView data={data} />
}
