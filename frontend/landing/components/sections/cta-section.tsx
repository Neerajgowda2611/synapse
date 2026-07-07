"use client"

import { useRef, useState } from "react"
import { motion, useInView, AnimatePresence } from "framer-motion"
import { ArrowUpRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CtaSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubmitted(true)
    }
  }

  return (
    <section id="final-cta" className="relative overflow-hidden bg-background px-6 py-24 sm:py-32">
      {/* Layered gradient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute bottom-0 left-1/2 h-[600px] w-[800px] -translate-x-1/2 translate-y-1/2 rounded-full bg-primary/[0.07] blur-[120px]" />
      </div>

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-3xl"
      >
        <div className="rounded-3xl border border-primary/20 bg-card px-8 py-14 text-center shadow-sm sm:px-14">
          {/* Pill */}
          <div className="mb-6 inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-4 py-1 text-xs font-medium text-primary">
            Get Early Access
          </div>

          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Build profiles your learners are{" "}
            <span className="text-primary">actually proud of</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground lg:text-lg leading-relaxed">
            Join institutions already using Profiler to understand their learners like never before. Takes minutes to connect, days to see the difference.
          </p>

          {/* Trust signals */}
          <div className="mx-auto mt-6 flex max-w-sm flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {["Free to start", "No credit card", "Setup in minutes"].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-primary" />
                {item}
              </div>
            ))}
          </div>

          {/* Email form */}
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2 className="size-4" />
                You're on the list! We'll be in touch.
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@institution.edu"
                  className="h-11 w-full rounded-full border border-border/60 bg-background px-5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:flex-1"
                />
                <button
                  type="submit"
                  className={cn(buttonVariants({ size: "lg" }), "shrink-0 rounded-full px-6 text-sm font-semibold gap-1.5 group w-full sm:w-auto")}
                >
                  Request access
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Secondary CTA */}
          <p className="mt-5 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-2">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </section>
  )
}
