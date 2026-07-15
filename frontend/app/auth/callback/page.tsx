"use client"

import { Suspense } from "react"

import { AuthCallback } from "@/components/auth-callback"
import { AuthLoadingState } from "@/components/auth/auth-page-state"
import { AuthxCallback } from "@/components/authx-callback"
import { isAuthxEnabled } from "@/lib/authx-config"

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthLoadingState title="Signing you in" />}>
      {isAuthxEnabled ? <AuthxCallback /> : <AuthCallback />}
    </Suspense>
  )
}
