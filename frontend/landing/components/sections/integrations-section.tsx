"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import {
  Database,
  BookOpen,
  FileSpreadsheet,
  Code2,
  Layers,
  Users,
  GraduationCap,
  Building2,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const INTEGRATIONS = [
  {
    name: "PostgreSQL",
    type: "Database",
    description: "Connect any PostgreSQL database directly. Full schema discovery, automatic mapping.",
    icon: Database,
    tier: "core",
  },
  {
    name: "Moodle",
    type: "LMS",
    description: "The world's most popular LMS. Pull attendance, grades, activity logs.",
    icon: BookOpen,
    tier: "core",
  },
  {
    name: "Canvas LMS",
    type: "LMS",
    description: "Sync assignments, submissions, quiz results, and course engagement data.",
    icon: BookOpen,
    tier: "core",
  },
  {
    name: "Google Sheets",
    type: "Spreadsheet",
    description: "Import structured data from any Google Sheet. Supports dynamic ranges.",
    icon: FileSpreadsheet,
    tier: "core",
  },
  {
    name: "Projex",
    type: "Project Platform",
    description: "First-class integration with project-based learning. Team formation, deliverables, outcomes.",
    icon: Layers,
    tier: "xcelerator",
  },
  {
    name: "Mentorship",
    type: "Mentorship Platform",
    description: "Import mentor evaluations, session attendance, and feedback ratings.",
    icon: Users,
    tier: "xcelerator",
  },
  {
    name: "VTU Placements",
    type: "University System",
    description: "Sync placement cell data, company visits, offer letters, and registration records.",
    icon: GraduationCap,
    tier: "xcelerator",
  },
  {
    name: "Custom ERP",
    type: "Enterprise",
    description: "Any ERP or internal system via REST API or direct database connector.",
    icon: Building2,
    tier: "core",
  },
  {
    name: "Custom API",
    type: "Developer",
    description: "Build your own connector with our open connector SDK. Any data source, any format.",
    icon: Code2,
    tier: "custom",
  },
]

const TIER_LABELS: Record<string, string> = {
  core: "Core",
  xcelerator: "Xcelerator Suite",
  custom: "Custom",
}

const TIER_COLORS: Record<string, string> = {
  core: "bg-primary/10 text-primary border-primary/20",
  xcelerator: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  custom: "bg-foreground/8 text-muted-foreground border-border/60",
}

export function IntegrationsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section id="integrations" className="relative overflow-hidden bg-background px-6 py-24 sm:py-32">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      <div ref={ref} className="relative mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mb-5 inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-4 py-1 text-xs font-medium text-primary">
            Integrations
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Works with every system you already use
          </h2>
          <p className="mt-4 text-base text-muted-foreground lg:text-lg leading-relaxed">
            No rip-and-replace. Profiler connects to your existing stack, discovers the schema, and starts pulling data within minutes.
          </p>
        </motion.div>

        {/* Integration grid */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((integration, i) => {
            const Icon = integration.icon
            return (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="group relative rounded-2xl border border-border/60 bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05] ring-1 ring-border/30 transition-colors group-hover:bg-primary/10">
                    <Icon className="size-5 text-foreground/60 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{integration.name}</h3>
                      <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", TIER_COLORS[integration.tier])}>
                        {TIER_LABELS[integration.tier]}
                      </span>
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5 mb-1.5">{integration.type}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{integration.description}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-10 flex flex-col items-center gap-3 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Don't see your system?{" "}
            <Link href="#final-cta" className="font-medium text-primary hover:underline underline-offset-2">
              Request an integration <ArrowRight className="inline size-3.5" />
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  )
}
