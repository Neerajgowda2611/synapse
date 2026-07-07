"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import {
  GitMerge,
  Sparkles,
  ShieldCheck,
  Globe,
  ArrowLeftRight,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

const FEATURES = [
  {
    icon: GitMerge,
    title: "Multi-source, multi-system",
    description:
      "Connect any institutional system — LMS, ERP, project tools, mentorship platforms. Data from every source is reconciled into one unified learner record.",
    span: "col-span-1 sm:col-span-2",
    accent: "from-blue-500/10 to-transparent",
  },
  {
    icon: Sparkles,
    title: "AI-powered signals",
    description:
      "The derivation engine transforms raw observations into first-order insights — submission timing, attendance patterns, initiative count — automatically.",
    span: "col-span-1",
    accent: "from-violet-500/10 to-transparent",
  },
  {
    icon: ShieldCheck,
    title: "Verifiable credentials",
    description:
      "Every signal carries source, timestamp, and data-level attestation. Credentialing is built into the data source, not bolted on afterward.",
    span: "col-span-1",
    accent: "from-emerald-500/10 to-transparent",
  },
  {
    icon: Globe,
    title: "Reward systems as context",
    description:
      "Every metric is captured in context. A profile is never read in isolation — it's always relative to the environment it was earned in.",
    span: "col-span-1",
    accent: "from-amber-500/10 to-transparent",
  },
  {
    icon: ArrowLeftRight,
    title: "Transposition across contexts",
    description:
      "The defining capability. Reliably translate a learner's profile from one reward system to another — from college to company to community.",
    span: "col-span-1 sm:col-span-2",
    accent: "from-primary/10 to-transparent",
    highlight: true,
  },
  {
    icon: BarChart3,
    title: "Aggregated, readable metrics",
    description:
      "Agency. Reliability. Impact. Human-readable, context-bound metrics — never raw data dumps. Surface the insight, not the noise.",
    span: "col-span-1",
    accent: "from-rose-500/10 to-transparent",
  },
]

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section id="product" className="relative overflow-hidden bg-background px-6 py-24 sm:py-32">
      <div ref={ref} className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mb-5 inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-4 py-1 text-xs font-medium text-primary">
            Platform Capabilities
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Built on five design principles
          </h2>
          <p className="mt-4 text-base text-muted-foreground lg:text-lg leading-relaxed">
            Every capability traces back to the same conviction: context-bound, verifiable, and human-readable profiles are the only profiles worth having.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all duration-300 hover:shadow-md hover:border-border",
                  feature.span,
                  feature.highlight && "ring-1 ring-primary/30"
                )}
              >
                {/* Gradient accent */}
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40 transition-opacity duration-500 group-hover:opacity-70",
                    feature.accent
                  )}
                  aria-hidden
                />

                <div className="relative">
                  <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-foreground/[0.06] ring-1 ring-border/40">
                    <Icon className="size-5 text-foreground/70" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
