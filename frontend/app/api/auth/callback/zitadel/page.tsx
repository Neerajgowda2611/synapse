"use client"

import { Suspense } from "react"
import { AuthCallback } from "@/components/auth-callback"

export default function ZitadelAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Signing you in...</div>}>
      <AuthCallback />
    </Suspense>
  )
}
