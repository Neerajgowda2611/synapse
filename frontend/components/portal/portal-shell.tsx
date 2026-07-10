"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode } from "react"
import { GraduationCap } from "lucide-react"

import { ThemeSwitcher } from "@/components/layout/sidebar/theme-switcher"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { usePortalUser } from "@/contexts/portal-user-context"
import { clearAccessToken } from "@/lib/config"
import { getInitials } from "@/lib/utils"

const NAV_TABS = [
  { label: "Player Card", href: "/portal/player-card" },
  { label: "Three Streams", href: "/portal/three-streams" },
  { label: "Discover", href: "/portal/discover" },
] as const

type PortalShellProps = {
  children: ReactNode
}

export function PortalShell({ children }: PortalShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { name, email } = usePortalUser()

  function signOut() {
    clearAccessToken()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4" />
            <span className="text-sm font-semibold tracking-tight">Profiler</span>
          </div>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {NAV_TABS.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Separator orientation="vertical" className="mx-1 h-4" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="rounded-lg">
                  <Avatar className="size-7 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">{getInitials(name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <nav className="flex justify-center gap-2 border-t px-4 py-2 md:hidden">
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  isActive ? "bg-accent font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">{children}</main>
    </div>
  )
}
