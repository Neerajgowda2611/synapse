"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { cn } from "@/lib/utils"

const STATS = [
  { value: "87%", label: "of resumes look identical", sublabel: "According to ATS providers" },
  { value: "6 sec", label: "average time a recruiter spends on a resume", sublabel: "Before deciding to skip" },
  { value: "0", label: "context about who the person really is", sublabel: "Personality, drive, reliability — all missing" },
]

const PROBLEMS = [
  {
    side: "Resume",
    items: [
      "GPA: 8.4 / 10",
      "Internship: 3 months at TCS",
      "Skills: Python, Java, SQL",
      "Projects: E-commerce website",
    ],
    verdict: "Same as 1,000 others",
    bad: true,
  },
  {
    side: "Profiler",
    items: [
      "Agency: 87/100 — submits ahead of deadlines",
      "Reliability: Verified by 4 mentors across 2 years",
      "Impact: Led 3 cross-team projects, zero drop-outs",
      "Context: High performer in competitive cohort",
    ],
    verdict: "Uniquely, verifiably them",
    bad: false,
  },
]

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section className="relative overflow-hidden bg-background px-6 py-24 sm:py-32" id="audiences">
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-destructive/[0.03] blur-[100px]" />
      </div>

      <div ref={ref} className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center rounded-full border border-destructive/25 bg-destructive/8 px-4 py-1 text-xs font-medium text-destructive"
          >
            The Resume Problem
          </motion.div>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            In the race to impress,{" "}
            <span className="text-destructive">everyone converged</span>{" "}
            on the same piece of paper.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground lg:text-lg leading-relaxed">
            Students have become ATS-optimised clones. The resume was designed to capture history, not capture a person. The traits that matter most — agency, reliability, impact — live nowhere.
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-border/60 bg-card p-6 text-center"
            >
              <p className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{stat.value}</p>
              <p className="mt-2 text-sm font-medium text-foreground/80">{stat.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sublabel}</p>
            </motion.div>
          ))}
        </div>

        {/* Side-by-side comparison */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PROBLEMS.map((col, i) => (
            <motion.div
              key={col.side}
              initial={{ opacity: 0, y: 28 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.3 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "rounded-2xl border p-6",
                col.bad
                  ? "border-destructive/25 bg-destructive/[0.03]"
                  : "border-primary/30 bg-primary/[0.04]"
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  col.bad
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/15 text-primary"
                )}>
                  {col.bad ? "Before" : "After"} — {col.side}
                </span>
                <span className={cn(
                  "text-xs font-medium",
                  col.bad ? "text-destructive/70" : "text-primary/70"
                )}>
                  {col.verdict}
                </span>
              </div>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className={cn(
                      "mt-1 size-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold",
                      col.bad
                        ? "bg-destructive/15 text-destructive"
                        : "bg-primary/15 text-primary"
                    )}>
                      {col.bad ? "–" : "✓"}
                    </span>
                    <span className="text-sm text-foreground/80 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
