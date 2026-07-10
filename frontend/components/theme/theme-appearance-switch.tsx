"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useShallow } from "zustand/react/shallow"

import { cn } from "@/lib/utils"
import type { ThemeMode } from "@/lib/preferences/theme"
import { usePreferencesStore } from "@/stores/preferences/preferences-provider"

const OPTIONS: Array<{ value: ThemeMode; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
]

export function ThemeAppearanceSwitch() {
  const { themeMode, setPreference } = usePreferencesStore(
    useShallow((state) => ({
      themeMode: state.values.theme_mode,
      setPreference: state.setPreference,
    }))
  )

  return (
    <fieldset
      className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5"
      aria-label="Appearance mode"
    >
      <legend className="sr-only">Appearance mode</legend>
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = themeMode === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={isActive}
            aria-label={`${label} mode`}
            onClick={() => setPreference("theme_mode", value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            <span>{label}</span>
          </button>
        )
      })}
    </fieldset>
  )
}
