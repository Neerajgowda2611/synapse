"use client"

import { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { performLogout } from "@/lib/auth-logout"

type AdminShellProps = {
  email?: string
  title: string
  description?: string
  action?: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  children: ReactNode
}

export function AdminShell({
  email,
  title,
  description,
  action,
  breadcrumbs,
  children,
}: AdminShellProps) {
  const router = useRouter()

  function signOut() {
    void performLogout("/login")
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <header className="border-b border-gray-200/80 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm font-semibold tracking-tight text-gray-900 hover:text-gray-600"
          >
            Profiler
          </button>
          <div className="flex items-center gap-3 text-sm">
            {email && <span className="hidden text-gray-500 sm:inline">{email}</span>}
            <button
              onClick={signOut}
              className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 && <span className="text-gray-300">/</span>}
                {crumb.href ? (
                  <button
                    onClick={() => router.push(crumb.href!)}
                    className="hover:text-gray-900"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-gray-700">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>}
          </div>
          {action}
        </div>

        {children}
      </main>
    </div>
  )
}
