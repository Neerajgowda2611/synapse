export type ColorThemeId =
  | "studio"
  | "galaxy"
  | "sunrise"
  | "forest"
  | "ocean"
  | "blossom"
  | "volt"
  | "autumn"
  | "matrix"
  | "candy"
  | "midnight"
  | "tropical"
  | "classic"

export type RadiusStyleId = "studio" | "sharp" | "default" | "rounded" | "pill"

export interface ColorThemeMeta {
  id: ColorThemeId
  name: string
  emoji: string
  description: string
  previewColors: [string, string, string, string]
}

export const COLOR_THEME_OPTIONS: ColorThemeMeta[] = [
  {
    id: "studio",
    name: "Studio",
    emoji: "◆",
    description: "Neutral Studio Admin palette",
    previewColors: [
      "oklch(0.87 0 0)",
      "oklch(0.556 0 0)",
      "oklch(0.205 0 0)",
      "oklch(0.97 0 0)",
    ],
  },
  {
    id: "galaxy",
    name: "Galaxy",
    emoji: "🌌",
    description: "Deep space vibes",
    previewColors: [
      "oklch(0.60 0.25 293)",
      "oklch(0.55 0.22 310)",
      "oklch(0.65 0.22 340)",
      "oklch(0.12 0.04 293)",
    ],
  },
  {
    id: "sunrise",
    name: "Sunrise",
    emoji: "🌅",
    description: "Warm and energetic",
    previewColors: [
      "oklch(0.65 0.20 32)",
      "oklch(0.72 0.18 60)",
      "oklch(0.58 0.22 20)",
      "oklch(0.98 0.01 60)",
    ],
  },
  {
    id: "forest",
    name: "Forest",
    emoji: "🌿",
    description: "Fresh and calm",
    previewColors: [
      "oklch(0.65 0.18 155)",
      "oklch(0.70 0.12 145)",
      "oklch(0.75 0.20 130)",
      "oklch(0.98 0.01 155)",
    ],
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🩵",
    description: "Clean and tech-forward",
    previewColors: [
      "oklch(0.72 0.18 204)",
      "oklch(0.60 0.20 240)",
      "oklch(0.78 0.15 200)",
      "oklch(0.10 0.03 220)",
    ],
  },
  {
    id: "blossom",
    name: "Blossom",
    emoji: "🌸",
    description: "Playful and soft",
    previewColors: [
      "oklch(0.65 0.25 348)",
      "oklch(0.68 0.20 10)",
      "oklch(0.80 0.12 30)",
      "oklch(0.99 0.005 350)",
    ],
  },
  {
    id: "volt",
    name: "Volt",
    emoji: "⚡",
    description: "Bold high-contrast",
    previewColors: [
      "oklch(0.92 0.20 100)",
      "oklch(0.88 0.22 120)",
      "oklch(0.85 0.25 140)",
      "oklch(0.06 0 0)",
    ],
  },
  {
    id: "autumn",
    name: "Autumn",
    emoji: "🍂",
    description: "Cozy vintage warmth",
    previewColors: [
      "oklch(0.58 0.18 35)",
      "oklch(0.65 0.15 55)",
      "oklch(0.75 0.17 75)",
      "oklch(0.97 0.02 75)",
    ],
  },
  {
    id: "matrix",
    name: "Matrix",
    emoji: "🤖",
    description: "Terminal hacker mode",
    previewColors: [
      "oklch(0.75 0.25 145)",
      "oklch(0.70 0.20 175)",
      "oklch(0.80 0.22 135)",
      "oklch(0.07 0.01 145)",
    ],
  },
  {
    id: "candy",
    name: "Candy",
    emoji: "🍬",
    description: "Pastel pop",
    previewColors: [
      "oklch(0.75 0.22 348)",
      "oklch(0.75 0.18 220)",
      "oklch(0.80 0.15 165)",
      "oklch(0.99 0.005 300)",
    ],
  },
  {
    id: "midnight",
    name: "Midnight",
    emoji: "🌙",
    description: "Late-night focus",
    previewColors: [
      "oklch(0.58 0.22 270)",
      "oklch(0.55 0.15 250)",
      "oklch(0.68 0.18 278)",
      "oklch(0.09 0.02 255)",
    ],
  },
  {
    id: "tropical",
    name: "Tropical",
    emoji: "🌺",
    description: "Bold tropical energy",
    previewColors: [
      "oklch(0.62 0.20 190)",
      "oklch(0.60 0.28 325)",
      "oklch(0.70 0.20 25)",
      "oklch(0.98 0.01 60)",
    ],
  },
  {
    id: "classic",
    name: "Classic",
    emoji: "🏛️",
    description: "Formal and institutional",
    previewColors: [
      "oklch(0.35 0.15 255)",
      "oklch(0.45 0.18 265)",
      "oklch(0.75 0.18 75)",
      "oklch(0.98 0.005 80)",
    ],
  },
]

export const COLOR_THEME_VALUES = COLOR_THEME_OPTIONS.map((theme) => theme.id)

export const RADIUS_STYLE_OPTIONS = [
  { id: "studio" as const, label: "Studio", preview: "10px" },
  { id: "sharp" as const, label: "Sharp", preview: "2px" },
  { id: "default" as const, label: "Default", preview: "8px" },
  { id: "rounded" as const, label: "Rounded", preview: "16px" },
  { id: "pill" as const, label: "Pill", preview: "24px" },
]

export const RADIUS_STYLE_VALUES = RADIUS_STYLE_OPTIONS.map((option) => option.id)
