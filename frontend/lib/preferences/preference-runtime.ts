"use client"

import { PREFERENCE_REGISTRY, type PreferenceKey, type PreferenceValueMap } from "./preferences-config"
import type { ResolvedThemeMode } from "./theme"
import { applyThemeMode } from "./theme-utils"

export function applyPreference<K extends PreferenceKey>(
  key: K,
  value: PreferenceValueMap[K],
): ResolvedThemeMode | undefined {
  if (key === "theme_mode") {
    return applyThemeMode(value as PreferenceValueMap["theme_mode"])
  }

  if (key === "color_theme") {
    const root = document.documentElement
    if (value === "studio") {
      root.removeAttribute("data-theme")
    } else {
      root.setAttribute("data-theme", value as string)
    }
    return undefined
  }

  document.documentElement.setAttribute(PREFERENCE_REGISTRY[key].attribute, value)
  return undefined
}
