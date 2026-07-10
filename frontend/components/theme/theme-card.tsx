"use client"

import { cn } from "@/lib/utils"
import type { ColorThemeMeta } from "@/lib/themes/color-themes"

type ThemeCardProps = {
  theme: ColorThemeMeta
  isActive: boolean
  onSelect: (id: ColorThemeMeta["id"]) => void
}

export function ThemeCard({ theme, isActive, onSelect }: ThemeCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={`Select ${theme.name} theme`}
      onClick={() => onSelect(theme.id)}
      className={cn(
        "group relative flex flex-col items-start gap-1.5 rounded-xl border-2 p-2 text-left transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        isActive
          ? "border-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_30%,transparent)]"
          : "border-border hover:border-primary/40 hover:shadow-sm"
      )}
    >
      <div className="flex h-8 w-full overflow-hidden rounded-md">
        {theme.previewColors.map((color) => (
          <div key={color} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="flex w-full items-center gap-1">
        <span className="text-sm leading-none">{theme.emoji}</span>
        <span
          className={cn(
            "truncate text-[11px] font-medium leading-none",
            isActive ? "text-primary" : "text-foreground"
          )}
        >
          {theme.name}
        </span>
      </div>
    </button>
  )
}
