"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { clearAccessToken, getAccessToken } from "@/lib/config"
import { MeResponse, getMe } from "@/lib/api/data-sources"

export function useAdminAuth() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    getMe()
      .then((meData) => {
        if (meData.user_type !== "institution") {
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

  return { me, loading }
}
