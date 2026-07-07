"use client"

import React, { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Plug, BrainCircuit, UserCircle2, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    step: "01",
    icon: Plug,
    title: "Connect your systems",
    description:
      "Link any data source your institution uses — Moodle, ERP, Canvas, Google Sheets, Projex, or a custom database. Our AI discovers the schema and maps it automatically.",
    detail: ["Moodle", "ERP / SIS", "Canvas", "Google Sheets", "Projex", "Custom API"],
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    border: "border-blue-500/20",
  },
  {
    step: "02",
    icon: BrainCircuit,
    title: "AI extracts the signals",
    description:
      "The derivation engine turns raw observations — submission dates, attendance logs, peer reviews — into human-readable signals: 'submitted 2 days early', 'led 3 initiatives', 'zero late submissions'.",
    detail: ["Observations → Signals", "Versioned derivations", "Context-aware rules", "Verified sources"],
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    border: "border-violet-500/20",
  },
  {
    step: "03",
    icon: UserCircle2,
    title: "The profile emerges",
    description:
      "Signals aggregate into metrics — Agency, Reliability, Impact. Every metric is context-bound, comparable, and verifiably credentialed. Learners get a profile that actually represents them.",
    detail: ["Agency score", "Reliability score", "Impact score", "Reward system context"],
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/25",
  },
]

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-background px-6 py-24 sm:py-32">
      {/* Dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle, var(--color-foreground) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      <div ref={ref} className="relative mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="mb-5 inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-4 py-1 text-xs font-medium text-primary">
            How It Works
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Raw data in. Genuine profiles out.
          </h2>
          <p className="mt-4 text-base text-muted-foreground lg:text-lg leading-relaxed">
            Three steps from your existing systems to a learner profile that's
            intelligent, verifiable, and impossible to fake.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mt-16 space-y-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <React.Fragment key={step.step}>
                <motion.div
                  initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.65, delay: 0.15 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative rounded-2xl border border-border/60 bg-card p-6 transition-shadow hover:shadow-md sm:p-8"
                >
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                    {/* Step indicator */}
                    <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-center sm:gap-2">
                      <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl border", step.bg, step.border)}>
                        <Icon className={cn("size-5", step.color)} strokeWidth={1.5} />
                      </div>
                      <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{step.step}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{step.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed sm:text-base">{step.description}</p>
                      {/* Tags */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {step.detail.map((d) => (
                          <span
                            key={d}
                            className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-medium", step.bg, step.border, step.color)}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Connector arrow between steps */}
                {i < STEPS.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={isInView ? { opacity: 1, scaleY: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
                    className="flex justify-center"
                    style={{ transformOrigin: "top" }}
                  >
                    <div className="flex h-10 flex-col items-center gap-0">
                      <div className="h-8 w-px bg-border/50" />
                      <ArrowDown className="size-3.5 text-border" />
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </section>
  )
}
