"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PortalShell } from "@/components/portal/portal-shell"
import { PortalUserProvider } from "@/contexts/portal-user-context"
import { api } from "@/lib/api/client"
import { clearAccessToken, getAccessToken } from "@/lib/config"

interface MeResponse {
  email: string
  name: string
  user_type: string
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    api
      .get<MeResponse>("/api/v1/auth/me")
      .then((meData) => {
        if (meData.user_type !== "learner") {
          router.replace("/dashboard")
          return
        }
        setMe(meData)
      })
      .catch(() => {
        clearAccessToken()
        router.replace("/login")
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!me) return null

  return (
    <PortalUserProvider user={{ name: me.name, email: me.email }}>
      <PortalShell>{children}</PortalShell>
    </PortalUserProvider>
  )
}
