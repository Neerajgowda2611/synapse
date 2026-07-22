"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export type DataSourceTabId = "setup" | "schema" | "entities" | "fields" | "data" | "health"

const TAB_ITEMS: Array<{ id: DataSourceTabId; label: string; segment: string }> = [
  { id: "setup", label: "Setup", segment: "" },
  { id: "schema", label: "Schema", segment: "/schema" },
  { id: "entities", label: "Entities", segment: "/entities" },
  { id: "fields", label: "Field mapping", segment: "/fields" },
  { id: "data", label: "Data", segment: "/data" },
  { id: "health", label: "Sync health", segment: "/health" },
]

type DataSourceTabsProps = {
  dataSourceId: string
  isWebhook?: boolean
}

export function DataSourceTabs({ dataSourceId, isWebhook }: DataSourceTabsProps) {
  const pathname = usePathname()
  const base = `/admin/data-sources/${dataSourceId}`

  const tabs = TAB_ITEMS.filter((tab) => {
    if (tab.id === "health" && isWebhook) return false
    return true
  })

  function isActive(tab: (typeof TAB_ITEMS)[number]) {
    const href = `${base}${tab.segment}`
    if (tab.id === "setup") {
      return pathname === base
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
      {tabs.map((tab) => {
        const href = `${base}${tab.segment}`
        const active = isActive(tab)
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
