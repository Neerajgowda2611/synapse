"use client"

import { useEffect, useState } from "react"

import { LoadingState } from "@/components/admin/loading-state"
import { InstitutionUsersPanel } from "@/components/admin/users/institution-users-panel"
import { PageHeader } from "@/components/layout/page-header"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { listInstitutionUsers, type InstitutionUser } from "@/lib/api/institution-users"

export default function AdminUsersPage() {
  const { me, loading: authLoading } = useAdminAuth()
  const [users, setUsers] = useState<InstitutionUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!me?.institution_id) {
      setLoading(false)
      return
    }

    listInstitutionUsers(me.institution_id)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [authLoading, me?.institution_id])

  if (authLoading || loading) {
    return <LoadingState label="Loading users..." />
  }

  if (!me?.institution_id) {
    return (
      <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center text-sm text-muted-foreground">
        Your account is missing an institution assignment.
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage institution operators and admins who can configure data sources and view learner profiles."
      />

      <InstitutionUsersPanel institutionId={me.institution_id} initialUsers={users} />
    </>
  )
}
