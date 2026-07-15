"use client"

import { Suspense } from "react"

import { LoginForm } from "@/components/auth/login-form"
import { AuthLoadingState } from "@/components/auth/auth-page-state"
import { AuthxSignIn } from "@/components/authx-sign-in"
import { isAuthxEnabled } from "@/lib/authx-config"

export default function LoginPage() {
  if (isAuthxEnabled) {
    return (
      <Suspense fallback={<AuthLoadingState title="Loading sign in" />}>
        <AuthxSignIn />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<AuthLoadingState title="Loading sign in" />}>
      <LoginForm />
    </Suspense>
  )
}
