"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { ReactNode, useState } from "react"

import { ThemeSwitcher } from "@/components/layout/sidebar/theme-switcher"
import { SkipToContent } from "@/components/layout/skip-to-content"
import { PortalBrandMark } from "@/components/portal/portal-page-header"

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
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { usePortalUser } from "@/contexts/portal-user-context"
import { clearAccessToken } from "@/lib/config"
import { cn, getInitials } from "@/lib/utils"
import { performLogout } from "@/lib/auth-logout"

const NAV_TABS = [
  { label: "Player Card", href: "/portal/player-card", short: "Card" },
  { label: "Three Streams", href: "/portal/three-streams", short: "Streams" },
  { label: "Discover", href: "/portal/discover", short: "Discover" },
] as const

type PortalShellProps = {
  children: ReactNode
}

function NavLink({
  href,
  label,
  isActive,
  onClick,
  className,
}: {
  href: string
  label: string
  isActive: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        className
      )}
    >
      {label}
    </Link>
  )
}

export function PortalShell({ children }: PortalShellProps) {
  const pathname = usePathname()
  const { name, email } = usePortalUser()
  const [mobileOpen, setMobileOpen] = useState(false)

  function signOut() {
    void performLogout("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <SkipToContent />
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/75">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(100vw-2rem,20rem)] p-0">
                <SheetHeader className="border-b px-4 py-4 text-left">
                  <SheetTitle className="text-base">Your portal</SheetTitle>
                  <p className="text-xs text-muted-foreground">{name}</p>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-3">
                  {NAV_TABS.map((tab) => (
                    <NavLink
                      key={tab.href}
                      href={tab.href}
                      label={tab.label}
                      isActive={pathname === tab.href}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </nav>
                <div className="mt-auto border-t p-4">
                  <Button variant="outline" className="w-full" onClick={signOut}>
                    Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <PortalBrandMark />
          </div>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex" aria-label="Portal sections">
            {NAV_TABS.map((tab) => (
              <NavLink
                key={tab.href}
                href={tab.href}
                label={tab.label}
                isActive={pathname === tab.href}
              />
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeSwitcher />
            <Separator orientation="vertical" className="mx-0.5 hidden h-4 sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="rounded-lg" aria-label="Account menu">
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

        <nav
          className="flex justify-center gap-1 overflow-x-auto border-t px-3 py-2 md:hidden"
          aria-label="Portal sections"
        >
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.short}
              </Link>
            )
          })}
        </nav>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-screen-2xl p-4 outline-none md:p-6"
      >
        {children}
      </main>
    </div>
  )
}
