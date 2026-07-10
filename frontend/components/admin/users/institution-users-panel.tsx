"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { AddUserDialog } from "@/components/admin/users/add-user-dialog"
import { InstitutionUsersTable } from "@/components/admin/users/institution-users-table"
import { Button } from "@/components/ui/button"
import type { InstitutionUser } from "@/lib/api/institution-users"

type InstitutionUsersPanelProps = {
  institutionId: string
  initialUsers: InstitutionUser[]
}

export function InstitutionUsersPanel({
  institutionId,
  initialUsers,
}: InstitutionUsersPanelProps) {
  const [users, setUsers] = useState(initialUsers)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Add user
        </Button>
      </div>

      <InstitutionUsersTable users={users} />

      <AddUserDialog
        institutionId={institutionId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(user) => setUsers((current) => [user, ...current])}
      />
    </>
  )
}
