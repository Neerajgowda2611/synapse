"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { LoadingState } from "@/components/admin/loading-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api/client"
import { clearAccessToken, getAccessToken } from "@/lib/config"
import { performLogout } from "@/lib/auth-logout"

interface Institution {
  id: string
  name: string
  type?: string
  status: string
}

interface MeResponse {
  email: string
  user_type: string
}

export default function PlatformPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) return

    Promise.all([
      api.get<MeResponse>("/api/v1/auth/me"),
      api.get<{ data: Institution[] }>("/api/v1/institutions"),
    ])
      .then(([, instData]) => {
        setInstitutions(instData.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [router])

  function signOut() {
    void performLogout("/login")
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <>
      <PageHeader
        title="Institutions"
        description="Manage organizations connected to the Profiler platform."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All institutions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {institutions.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              No institutions yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => (
                    <tr key={inst.id} className="border-b border-border/60">
                      <td className="px-4 py-3 font-medium text-foreground">{inst.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inst.type ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={inst.status === "active" ? "default" : "secondary"}>
                          {inst.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
