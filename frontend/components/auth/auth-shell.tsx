import Image from "next/image"
import Link from "next/link"
import { BarChart3, Layers, ShieldCheck } from "lucide-react"

import { APP_CONFIG } from "@/config/app-config"
import { cn } from "@/lib/utils"

const HIGHLIGHTS = [
  {
    icon: Layers,
    title: "Multi-source profiling",
    description: "Connect Placement, Mentorship, and Proje-x into one learner view.",
  },
  {
    icon: BarChart3,
    title: "Verified signals",
    description: "Metrics derived from observations — not self-reported claims.",
  },
  {
    icon: ShieldCheck,
    title: "Context-aware fit",
    description: "Role fit scores grounded in reward systems and evidence trails.",
  },
] as const

type AuthShellProps = {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function AuthShell({ children, title, description, className }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden border-r border-border bg-muted/40 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--primary)_0%,transparent_42%)] opacity-20" />
        <div className="relative flex flex-col gap-10 p-10 xl:p-14">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/logo-only.svg"
              alt=""
              width={36}
              height={36}
              className="size-9"
              priority
            />
            <div>
              <p className="text-lg font-semibold tracking-tight">{APP_CONFIG.name}</p>
              <p className="text-xs text-muted-foreground">The Learner Intelligence Platform</p>
            </div>
          </Link>

          <div className="space-y-3">
            <h1 className="max-w-md text-3xl font-semibold tracking-tight text-foreground xl:text-4xl">
              Beyond the resume.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              {APP_CONFIG.meta.description}
            </p>
          </div>

          <ul className="max-w-md space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background/80">
                  <item.icon className="size-4 text-primary" aria-hidden />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative px-10 pb-10 text-xs text-muted-foreground xl:px-14">
          Part of the Xcelerator education suite.
        </p>
      </aside>

      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
        <div className={cn("w-full max-w-md space-y-8", className)}>
          <div className="space-y-2 text-center lg:text-left">
            <Link href="/" className="mx-auto inline-flex items-center gap-2 lg:mx-0">
              <Image
                src="/logo-only.svg"
                alt=""
                width={28}
                height={28}
                className="size-7 lg:hidden"
              />
              <span className="text-sm font-semibold tracking-tight lg:hidden">{APP_CONFIG.name}</span>
            </Link>
            {title ? (
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                {description ? (
                  <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
