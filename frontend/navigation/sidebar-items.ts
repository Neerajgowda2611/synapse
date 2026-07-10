import {
  BarChart3,
  Building2,
  Compass,
  Database,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Plus,
  Sparkles,
  Users,
  Waves,
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
      {
        id: "learners",
        title: "Learners",
        url: "/admin/learners",
        icon: GraduationCap,
      },
      {
        id: "analytics",
        title: "Analytics",
        url: "/admin/analytics",
        icon: BarChart3,
      },
      {
        id: "users",
        title: "Users",
        url: "/admin/users",
        icon: Users,
      },
      {
        id: "workflows",
        title: "Workflows",
        url: "/admin/workflows",
        icon: GitBranch,
        badge: "soon",
      },
    ],
  },
]

export const portalSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Your portal",
    items: [
      {
        id: "player-card",
        title: "Player Card",
        url: "/portal/player-card",
        icon: Sparkles,
      },
      {
        id: "three-streams",
        title: "Three Streams",
        url: "/portal/three-streams",
        icon: Waves,
      },
      {
        id: "discover",
        title: "Discover",
        url: "/portal/discover",
        icon: Compass,
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
