"use client"

import { ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { SkipToContent } from "@/components/layout/skip-to-content"
import { LayoutControls } from "@/components/layout/sidebar/layout-controls"
import { SearchDialog } from "@/components/layout/sidebar/search-dialog"
import { ThemeSwitcher } from "@/components/layout/sidebar/theme-switcher"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { LoadingState } from "@/components/admin/loading-state"
import { DashboardUserProvider } from "@/contexts/dashboard-user-context"
import { getMe } from "@/lib/api/data-sources"
import { clearAccessToken, getAccessToken } from "@/lib/config"
import { getProfilerMe } from "@/lib/api/profiler"
import { adminSidebarItems, platformSidebarItems, portalSidebarItems } from "@/navigation/sidebar-items"
import { cn } from "@/lib/utils"

const SURFACE_CONFIG = {
  admin: {
    items: adminSidebarItems,
    homeHref: "/admin",
    requiredUserType: "institution" as const,
    searchPlaceholder: "Search admin pages…",
  },
  platform: {
    items: platformSidebarItems,
    homeHref: "/platform",
    requiredUserType: "platform" as const,
    searchPlaceholder: "Search platform pages…",
  },
  portal: {
    items: portalSidebarItems,
    homeHref: "/portal/player-card",
    requiredUserType: "learner" as const,
    searchPlaceholder: "Search your portal…",
  },
}

type DashboardShellProps = {
  children: ReactNode
  surface: keyof typeof SURFACE_CONFIG
  userName?: string
}

export function DashboardShell({ children, surface, userName }: DashboardShellProps) {
  const { items, homeHref, requiredUserType, searchPlaceholder } = SURFACE_CONFIG[surface]
  const router = useRouter()
  const [email, setEmail] = useState<string>("")
  const [displayName, setDisplayName] = useState<string>(userName ?? "")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login")
      return
    }

    const loadMe = requiredUserType === "learner" ? getProfilerMe() : getMe()

    loadMe
      .then((me) => {
        if (me.user_type !== requiredUserType) {
          router.replace("/dashboard")
          return
        }
        setEmail(me.email)
        if (requiredUserType === "learner" && "name" in me && typeof me.name === "string") {
          setDisplayName(me.name)
        }
      })
      .catch(() => {
        clearAccessToken()
        router.replace("/login")
      })
      .finally(() => setLoading(false))
  }, [router, requiredUserType])

  if (loading) {
    return <LoadingState />
  }

  return (
    <DashboardUserProvider email={email} name={displayName}>
      <SkipToContent />
      <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as React.CSSProperties
      }
    >
      <AppSidebar items={items} homeHref={homeHref} />
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
          "[--dashboard-header-height:--spacing(12)]",
          "min-w-0 overflow-x-clip",
        )}
      >
        <header
          aria-label="Dashboard"
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
              />
              <SearchDialog items={items} placeholder={searchPlaceholder} />
            </div>
            <div className="flex items-center gap-2">
              <LayoutControls />
              <ThemeSwitcher />
            </div>
          </div>
        </header>
        <div
          id="main-content"
          tabIndex={-1}
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 outline-none md:p-6"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </DashboardUserProvider>
  )
}
