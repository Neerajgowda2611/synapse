"use client"

import { Suspense, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import {
  AUTH_LOGOUT_RETURN_KEY,
  AUTH_REDIRECT_KEY,
  clearAccessToken,
} from "@/lib/config"

function LogoutCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo")
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    clearAccessToken()

    const storedReturn = sessionStorage.getItem(AUTH_LOGOUT_RETURN_KEY)
    sessionStorage.removeItem(AUTH_LOGOUT_RETURN_KEY)
    sessionStorage.removeItem(AUTH_REDIRECT_KEY)
    const destination = storedReturn || returnTo || "/login"
    router.replace(destination)
  }, [returnTo, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Signing you out…</p>
    </div>
  )
}

export default function LogoutCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-600">Signing you out…</p>
        </div>
      }
    >
      <LogoutCallbackContent />
    </Suspense>
  )
}
