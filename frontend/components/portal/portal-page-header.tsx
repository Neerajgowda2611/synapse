import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

type PortalPageHeaderProps = {
  title: string
  description?: string
  className?: string
  action?: React.ReactNode
}

export function PortalPageHeader({
  title,
  description,
  className,
  action,
}: PortalPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function PortalBrandMark({ className }: { className?: string }) {
  return (
    <Link href="/portal/player-card" className={cn("flex items-center gap-2", className)}>
      <Image src="/logo-only.svg" alt="" width={24} height={24} className="size-6" />
      <span className="text-sm font-semibold tracking-tight">Profiler</span>
    </Link>
  )
}
