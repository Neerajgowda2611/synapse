"use client"

import { useEffect, useState } from "react"
import { CareerDiscoveryView } from "@/components/portal/career-discovery-view"
import { getCareerDiscovery } from "@/lib/api/career-discovery"
import type { CareerDiscoveryResponse } from "@/lib/profiling/career-discovery-types"

export default function DiscoverPage() {
  const [data, setData] = useState<CareerDiscoveryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCareerDiscovery()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading career discovery...</p>
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
