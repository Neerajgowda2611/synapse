import { isColorThemePreset } from "./theme"

export function applyThemePresetToDocument(value: string) {
  const root = document.documentElement

  if (isColorThemePreset(value)) {
    root.setAttribute("data-theme", value)
    root.removeAttribute("data-theme-preset")
    return
  }

  root.setAttribute("data-theme-preset", value)
  root.removeAttribute("data-theme")
}
