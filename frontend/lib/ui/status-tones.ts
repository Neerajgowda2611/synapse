import { cn } from "@/lib/utils"

export type SyncStatus = "completed" | "running" | "failed" | string

export function syncStatusTextClass(status: SyncStatus) {
  switch (status) {
    case "completed":
      return "text-chart-2"
    case "running":
      return "text-chart-3"
    case "failed":
      return "text-destructive"
    default:
      return "text-muted-foreground"
  }
}

export const tone = {
  success: {
    text: "text-chart-2",
    border: "border-chart-2/30",
    bg: "bg-chart-2/10",
    bgSubtle: "bg-chart-2/5",
    badge:
      "border-chart-2/30 bg-chart-2/10 text-chart-2",
    solid: "bg-chart-2 text-primary-foreground",
    alert: "border-chart-2/25 bg-chart-2/10 text-foreground",
  },
  info: {
    text: "text-chart-3",
    border: "border-chart-3/30",
    bg: "bg-chart-3/10",
  },
  active: {
    badge: "border-chart-2/30 bg-chart-2/10 text-chart-2",
  },
} as const

export function confidenceTextClass(confidence: number) {
  if (confidence >= 95) return tone.success.text
  if (confidence >= 85) return "text-foreground"
  return "text-muted-foreground"
}

export function acceptedMappingClass(isAccepted: boolean) {
  return cn(
    isAccepted ? `${tone.success.border} ${tone.success.bgSubtle}` : "border-border bg-muted/10"
  )
}
