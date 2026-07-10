"use client"

import { useShallow } from "zustand/react/shallow"

import { ProgressRing } from "@/components/portal/progress-ring"
import { Badge } from "@/components/ui/badge"
import { COLOR_THEME_OPTIONS } from "@/lib/themes/color-themes"
import { usePreferencesStore } from "@/stores/preferences/preferences-provider"

export function ThemeLivePreview() {
  const { colorTheme, resolvedThemeMode } = usePreferencesStore(
    useShallow((state) => ({
      colorTheme: state.values.color_theme,
      resolvedThemeMode: state.resolvedThemeMode,
    }))
  )

  const meta = COLOR_THEME_OPTIONS.find((theme) => theme.id === colorTheme) ?? COLOR_THEME_OPTIONS[0]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{
          background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 65%, var(--muted)))",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{meta.emoji}</span>
          <span className="text-xs font-semibold text-primary-foreground drop-shadow-sm">
            {meta.name}
          </span>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {resolvedThemeMode === "dark" ? "Dark" : "Light"}
        </Badge>
      </div>
      <div className="flex items-center gap-4 p-3">
        <ProgressRing value={78} size={52} strokeWidth={5}>
          <span className="text-[10px] font-semibold tabular-nums">78</span>
        </ProgressRing>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold text-card-foreground">Learner profile preview</p>
          <p className="text-[11px] text-muted-foreground">
            Player card strength and trait signals update live as you personalize.
          </p>
        </div>
      </div>
    </div>
  )
}
