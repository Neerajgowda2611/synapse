"use client"

import { useShallow } from "zustand/react/shallow"

import { cn } from "@/lib/utils"
import { RADIUS_STYLE_OPTIONS, type RadiusStyleId } from "@/lib/themes/color-themes"
import { usePreferencesStore } from "@/stores/preferences/preferences-provider"

export function RadiusPicker() {
  const { radiusStyle, setPreference } = usePreferencesStore(
    useShallow((state) => ({
      radiusStyle: state.values.radius_style,
      setPreference: state.setPreference,
    }))
  )

  return (
    <div className="grid grid-cols-5 gap-2">
      {RADIUS_STYLE_OPTIONS.map((option) => {
        const isActive = radiusStyle === option.id
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            aria-label={`${option.label} corners`}
            onClick={() => setPreference("radius_style", option.id as RadiusStyleId)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-2 transition-all",
              isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            )}
          >
            <div
              className={cn(
                "h-7 w-full border-2",
                isActive ? "border-primary bg-primary/10" : "border-muted-foreground/30 bg-muted/50"
              )}
              style={{ borderRadius: option.preview }}
            />
            <span
              className={cn(
                "text-[10px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
