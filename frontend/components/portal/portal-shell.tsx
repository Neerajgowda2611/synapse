"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import { Bell, Search, Settings } from "lucide-react"
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
import { usePortalUser } from "@/contexts/portal-user-context"
import { performLogout } from "@/lib/auth-logout"

const NAV_TABS = [
  { label: "Player Card", href: "/portal/player-card" },
  { label: "Three streams", href: "/portal/three-streams" },
  { label: "Discover", href: "/portal/discover" },
] as const

type PortalShellProps = {
  children: ReactNode
}

export function PortalShell({ children }: PortalShellProps) {
  const pathname = usePathname()
  const { name, email } = usePortalUser()

  function signOut() {
    void performLogout("/login")
  }

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="relative flex h-14 items-center justify-between px-[20px]">
          <span className="text-base font-bold tracking-tight text-foreground">Profiler</span>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
            {NAV_TABS.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`cursor-pointer pb-0.5 text-sm transition-colors ${
                    isActive
                      ? "border-b-2 border-foreground font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Button variant="ghost" size="icon-sm" aria-label="Search" className="cursor-pointer">
              <Search />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="cursor-pointer">
              <Bell />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Settings" className="cursor-pointer">
              <Settings />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" className="cursor-pointer p-0">
                    <Avatar size="sm">
                      <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{email}</p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer hover:bg-primary/10! hover:text-primary! focus:bg-primary/10! focus:text-primary! not-data-[variant=destructive]:hover:**:text-primary! not-data-[variant=destructive]:focus:**:text-primary!"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <nav className="flex justify-center gap-6 border-t border-border px-[20px] py-2 md:hidden">
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`cursor-pointer text-sm ${
                  isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="px-[20px] py-6 sm:py-8 **:data-[slot=accordion-trigger]:cursor-pointer **:data-[slot=dropdown-menu-item]:cursor-pointer **:data-[slot=dropdown-menu-trigger]:cursor-pointer **:data-[slot=tabs-trigger]:cursor-pointer [&_a]:cursor-pointer [&_button]:cursor-pointer **:[[role=menuitem]]:cursor-pointer **:[[role=tab]]:cursor-pointer">
        {children}
      </main>
    </div>
  )
}
