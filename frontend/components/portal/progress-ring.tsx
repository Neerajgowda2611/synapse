import { CHART_COLOR_VARS, type ChartColorIndex } from "@/lib/themes/chart-colors"
import { cn } from "@/lib/utils"

export type { ChartColorIndex } from "@/lib/themes/chart-colors"
export { chartColorVar } from "@/lib/themes/chart-colors"

type ProgressRingProps = {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  trackClassName?: string
  /** Chart token 1–5 for the progress arc color (theme-harmonic). */
  indicatorChart?: ChartColorIndex
  indicatorClassName?: string
  children?: React.ReactNode
}

export function ProgressRing({
  value,
  size = 72,
  strokeWidth = 6,
  className,
  trackClassName,
  indicatorChart = 3,
  indicatorClassName,
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn(trackClassName)}
          stroke="var(--muted)"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset] duration-500", indicatorClassName)}
          stroke={CHART_COLOR_VARS[indicatorChart]}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
