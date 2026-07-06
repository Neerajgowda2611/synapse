"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PortalShell } from "@/components/portal/portal-shell"
import { PortalUserProvider } from "@/contexts/portal-user-context"
import { getProfilerMe } from "@/lib/api/profiler"
import { clearAccessToken, getAccessToken } from "@/lib/config"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [me, setMe] = useState<{ userId: string; name: string; email: string } | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    getProfilerMe()
      .then((meData) => {
        if (meData.user_type !== "learner") {
          router.replace("/dashboard")
          return
        }
        setMe({
          userId: meData.user_id,
          name: meData.name,
          email: meData.email,
        })
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
    <PortalUserProvider user={me}>
      <PortalShell>{children}</PortalShell>
    </PortalUserProvider>
  )
}
