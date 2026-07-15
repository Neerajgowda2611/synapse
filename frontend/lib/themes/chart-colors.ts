export type ChartColorIndex = 1 | 2 | 3 | 4 | 5

export const CHART_COLOR_VARS: Record<ChartColorIndex, string> = {
  1: "var(--chart-1)",
  2: "var(--chart-2)",
  3: "var(--chart-3)",
  4: "var(--chart-4)",
  5: "var(--chart-5)",
}

export function chartColorVar(index: number): string {
  const normalized = (((index % 5) + 5) % 5) + 1
  return CHART_COLOR_VARS[normalized as ChartColorIndex]
}
