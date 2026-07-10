import {
  Building2,
  Database,
  LayoutDashboard,
  type LucideIcon,
  Plus,
} from "lucide-react"

export type NavBadge = "new" | "soon"

export interface NavSubItem {
  id: string
  title: string
  url: string
  icon?: LucideIcon
  badge?: NavBadge
  disabled?: boolean
  newTab?: boolean
}

interface NavItemBase {
  id: string
  title: string
  icon?: LucideIcon
  badge?: NavBadge
  disabled?: boolean
  newTab?: boolean
}

export interface NavMainLinkItem extends NavItemBase {
  url: string
  subItems?: never
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[]
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem

export interface NavGroup {
  id: number
  label?: string
  items: NavMainItem[]
}

export const adminSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Institution",
    items: [
      {
        id: "overview",
        title: "Overview",
        url: "/admin",
        icon: LayoutDashboard,
      },
      {
        id: "data-sources",
        title: "Data Sources",
        icon: Database,
        subItems: [
          {
            id: "all-sources",
            title: "All sources",
            url: "/admin",
          },
          {
            id: "new-data-source",
            title: "Add connector",
            url: "/admin/data-sources/new",
            icon: Plus,
          },
        ],
      },
    ],
  },
]

export const platformSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Platform",
    items: [
      {
        id: "institutions",
        title: "Institutions",
        url: "/platform",
        icon: Building2,
      },
    ],
  },
]
