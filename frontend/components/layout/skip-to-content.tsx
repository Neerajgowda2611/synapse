import { cn } from "@/lib/utils"

type SkipToContentProps = {
  targetId?: string
  className?: string
}

export function SkipToContent({ targetId = "main-content", className }: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
    >
      Skip to main content
    </a>
  )
}
