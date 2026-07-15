import { COLOR_THEME_OPTIONS } from "@/lib/themes/color-themes"

const THEME_MODE_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
] as const

export const THEME_MODE_VALUES = THEME_MODE_OPTIONS.map((o) => o.value)
export type ThemeMode = (typeof THEME_MODE_VALUES)[number]
export type ResolvedThemeMode = "light" | "dark"
export { THEME_MODE_OPTIONS }

export const STUDIO_THEME_PRESET_VALUES = ["default", "brutalist", "soft-pop", "tangerine"] as const
export type StudioThemePreset = (typeof STUDIO_THEME_PRESET_VALUES)[number]

export const COLOR_THEME_PRESET_VALUES = COLOR_THEME_OPTIONS.filter((theme) => theme.id !== "studio").map(
  (theme) => theme.id,
)
export type ColorThemePreset = (typeof COLOR_THEME_PRESET_VALUES)[number]

const STUDIO_THEME_PRESET_OPTIONS = [
  {
    kind: "studio" as const,
    label: "Default",
    value: "default",
    primary: {
      light: "oklch(0.205 0 0)",
      dark: "oklch(0.922 0 0)",
    },
  },
  {
    kind: "studio" as const,
    label: "Brutalist",
    value: "brutalist",
    primary: {
      light: "oklch(0.6489 0.237 26.9728)",
      dark: "oklch(0.7044 0.1872 23.1858)",
    },
  },
  {
    kind: "studio" as const,
    label: "Soft Pop",
    value: "soft-pop",
    primary: {
      light: "oklch(0.5106 0.2301 276.9656)",
      dark: "oklch(0.6801 0.1583 276.9349)",
    },
  },
  {
    kind: "studio" as const,
    label: "Tangerine",
    value: "tangerine",
    primary: {
      light: "oklch(0.64 0.17 36.44)",
      dark: "oklch(0.64 0.17 36.44)",
    },
  },
] as const

const COLOR_THEME_PRESET_OPTIONS = COLOR_THEME_OPTIONS.filter((theme) => theme.id !== "studio").map((theme) => ({
  kind: "color" as const,
  label: theme.name,
  value: theme.id,
  previewColors: theme.previewColors,
}))

export const THEME_PRESET_OPTIONS = [...STUDIO_THEME_PRESET_OPTIONS, ...COLOR_THEME_PRESET_OPTIONS]

export const THEME_PRESET_VALUES = THEME_PRESET_OPTIONS.map((preset) => preset.value)
export type ThemePreset = (typeof THEME_PRESET_VALUES)[number]

export function isStudioThemePreset(value: string): value is StudioThemePreset {
  return (STUDIO_THEME_PRESET_VALUES as readonly string[]).includes(value)
}

export function isColorThemePreset(value: string): value is ColorThemePreset {
  return (COLOR_THEME_PRESET_VALUES as readonly string[]).includes(value)
}
