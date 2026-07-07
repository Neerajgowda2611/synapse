"use client"

import { Suspense } from "react"
import { AuthCallback } from "@/components/auth-callback"
import { AuthxCallback } from "@/components/authx-callback"
import { isAuthxEnabled } from "@/lib/authx-config"

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Signing you in...
        </div>
      }
    >
      {isAuthxEnabled ? <AuthxCallback /> : <AuthCallback />}
    </Suspense>
  )
}
