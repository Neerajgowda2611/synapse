"use client"

import { Suspense } from "react"

import { AuthCallback } from "@/components/auth-callback"
import { AuthLoadingState } from "@/components/auth/auth-page-state"

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthLoadingState title="Signing you in" />}>
      <AuthCallback />
    </Suspense>
  )
}
