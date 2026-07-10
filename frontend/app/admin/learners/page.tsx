"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"

import { LearnerProfilePreview } from "@/components/admin/learners/learner-profile-preview"
import { LearnersTable } from "@/components/admin/learners/learners-table"
import { LoadingState } from "@/components/admin/loading-state"
import { PageHeader } from "@/components/layout/page-header"
import { Input } from "@/components/ui/input"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { loadAdminLearners, type LearnerRow } from "@/lib/admin/load-learners"

export default function AdminLearnersPage() {
  const { me, loading: authLoading } = useAdminAuth()
  const [learners, setLearners] = useState<LearnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [previewLearner, setPreviewLearner] = useState<LearnerRow | null>(null)

  useEffect(() => {
    if (authLoading || !me?.institution_id) return

    loadAdminLearners(me.institution_id)
      .then(setLearners)
      .catch(() => setLearners([]))
      .finally(() => setLoading(false))
  }, [authLoading, me?.institution_id])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return learners
    return learners.filter((learner) => {
      return (
        learner.name.toLowerCase().includes(needle) ||
        learner.email?.toLowerCase().includes(needle) ||
        learner.externalId?.toLowerCase().includes(needle)
      )
    })
  }, [learners, query])

  if (authLoading || loading) {
    return <LoadingState label="Loading learners..." />
  }

  return (
    <>
      <PageHeader
        title="Learners"
        description="Browse imported and registered learners, then preview generated profile signals."
      />

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or ID"
            className="pl-9"
          />
        </div>
      </div>

      <LearnersTable learners={filtered} onPreview={setPreviewLearner} />

      <LearnerProfilePreview
        learner={previewLearner}
        open={previewLearner != null}
        onOpenChange={(open) => {
          if (!open) setPreviewLearner(null)
        }}
      />
    </>
  )
}
