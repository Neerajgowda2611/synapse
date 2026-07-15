import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex h-64 w-full items-center justify-center rounded-xl border bg-muted/20", className)}
      role="status"
      aria-label="Loading chart"
    >
      <Skeleton className="h-[70%] w-[88%] rounded-md" />
    </div>
  )
}
