"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ApiError, api } from "@/lib/api/client"
import { clearAccessToken, getAccessToken } from "@/lib/config"

interface MeResponse {
  user_id: string
  email: string
  name: string
  user_type: "platform" | "institution" | "learner"
  role: string
}

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    api
      .get<MeResponse>("/api/v1/auth/me")
      .then((me) => {
        switch (me.user_type) {
          case "platform":
            router.replace("/platform")
            break
          case "institution":
            router.replace("/admin")
            break
          case "learner":
            router.replace("/portal")
            break
          default:
            router.replace("/login")
        }
      })
      .catch((err) => {
        clearAccessToken()
        if (err instanceof ApiError) {
          const body = err.body as { error?: string } | undefined
          if (body?.error === "user_not_provisioned") {
            router.replace("/login?error=user_not_provisioned")
            return
          }
          if (err.status === 401) {
            router.replace("/login")
            return
          }
        }
        router.replace("/login?error=auth_failed")
      })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Loading...</p>
    </div>
  )
}
