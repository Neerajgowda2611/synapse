"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, BookOpen, Building2, BriefcaseBusiness, Layers, TrendingUp, ShieldCheck, Database } from "lucide-react"
import { motion, useMotionValueEvent, useScroll, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/* ── Helpers ────────────────────────────────────────────────────── */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

/* ── Preview Panel Components ──────────────────────────────────── */

function LearnerProfilePanel() {
  const metrics = [
    { label: "Agency", value: 87, color: "bg-primary" },
    { label: "Reliability", value: 94, color: "bg-emerald-500" },
    { label: "Impact", value: 72, color: "bg-violet-500" },
  ]
  const signals = [
    "Submitted 2 days early on 8/10 projects",
    "Attended 96% of sessions",
    "Led 3 cross-team initiatives",
    "Verified by 4 mentors",
  ]
  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/40 bg-background/60 px-4 py-3">
        <div className="size-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">AK</div>
        <div>
          <p className="text-xs font-semibold text-foreground">Arjun Kumar</p>
          <p className="text-[10px] text-muted-foreground">B.Tech CSE · Batch 2025</p>
        </div>
        <div className="ml-auto">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-2.5" /> Verified
          </span>
        </div>
      </div>
      {/* Metrics */}
      <div className="px-4 py-3 space-y-2.5">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">{m.label}</span>
              <span className="text-[10px] font-semibold text-foreground">{m.value}/100</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", m.color)}
                initial={{ width: 0 }}
                animate={{ width: `${m.value}%` }}
                transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* Signals */}
      <div className="border-t border-border/30 px-4 py-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Signals</p>
        <div className="space-y-1.5">
          {signals.map((s) => (
            <div key={s} className="flex items-start gap-2">
              <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
              <p className="text-[10px] text-foreground/80 leading-tight">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InstitutionDashboardPanel() {
  const cohort = [
    { name: "Arjun K.", agency: 87, reliability: 94, placement: "TCS" },
    { name: "Priya M.", agency: 91, reliability: 88, placement: "Wipro" },
    { name: "Rahul S.", agency: 76, reliability: 97, placement: "Infosys" },
    { name: "Sneha R.", agency: 83, reliability: 90, placement: "–" },
  ]
  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/40 bg-background/60 px-4 py-3">
        <Building2 className="size-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">Institution Dashboard</p>
        <span className="ml-auto text-[10px] text-muted-foreground">Cohort 2025</span>
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-1 mb-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Name</span><span>Agency</span><span>Reliability</span><span>Placement</span>
        </div>
        <div className="space-y-2">
          {cohort.map((s) => (
            <div key={s.name} className="grid grid-cols-4 gap-1 items-center">
              <span className="text-[10px] font-medium text-foreground truncate">{s.name}</span>
              <div className="flex items-center gap-1">
                <div className="h-1 w-8 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${s.agency}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{s.agency}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1 w-8 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.reliability}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{s.reliability}</span>
              </div>
              <span className={cn("text-[9px] font-medium", s.placement === "–" ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400")}>
                {s.placement}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/30 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">4 learners · 3 sources connected</span>
        <span className="text-[10px] text-primary font-medium cursor-pointer hover:underline">View all →</span>
      </div>
    </div>
  )
}

function EmployerMatchPanel() {
  const candidates = [
    { name: "Shreenath G L.", fit: 96, badge: "Top Match", traits: ["High Agency", "Reliable", "Early Submitter"] },
    { name: "Priya M.", fit: 91, badge: "Strong Fit", traits: ["Leader", "Consistent", "Verified"] },
  ]
  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/40 bg-background/60 px-4 py-3">
        <BriefcaseBusiness className="size-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">Employer Match View</p>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary font-medium">SDE Intern</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {candidates.map((c) => (
          <div key={c.name} className="rounded-xl border border-border/40 bg-background/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary">
                  {c.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <span className="text-[10px] font-semibold text-foreground">{c.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("text-[9px] rounded-full px-1.5 py-0.5 font-medium", c.fit > 93 ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
                  {c.badge}
                </span>
                <span className="text-xs font-bold text-foreground">{c.fit}%</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {c.traits.map((t) => (
                <span key={t} className="text-[9px] rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border/30 px-4 py-2 flex items-center gap-1.5">
        <TrendingUp className="size-2.5 text-emerald-500" />
        <span className="text-[10px] text-muted-foreground">All traits are verified · context-bound</span>
      </div>
    </div>
  )
}

function DataSourcesPanel() {
  const sources = [
    { name: "Moodle LMS", type: "Academic", records: "1,204", icon: BookOpen, synced: true },
    { name: "ERP System", type: "Attendance", records: "892", icon: Database, synced: true },
    { name: "Projex", type: "Projects", records: "347", icon: Layers, synced: true },
    { name: "Google Sheets", type: "Assessments", records: "156", icon: Database, synced: false },
  ]
  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border/40 bg-background/60 px-4 py-3">
        <Database className="size-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">Connected Data Sources</p>
      </div>
      <div className="px-4 py-3 space-y-2">
        {sources.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.name} className="flex items-center gap-3 rounded-xl border border-border/30 bg-background/40 px-3 py-2.5">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="size-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-foreground truncate">{s.name}</p>
                <p className="text-[9px] text-muted-foreground">{s.type} · {s.records} records</p>
              </div>
              <div className={cn(
                "size-2 rounded-full shrink-0",
                s.synced ? "bg-emerald-500" : "bg-amber-400"
              )} />
            </div>
          )
        })}
      </div>
      <div className="border-t border-border/30 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">3 active · 1 pending</span>
        <span className="text-[10px] text-primary font-medium cursor-pointer hover:underline flex items-center gap-0.5">Add source <ArrowRight className="size-2.5" /></span>
      </div>
    </div>
  )
}

/* ── Tab Rail ────────────────────────────────────────────────────── */
interface Tab { id: string; label: string; panel: React.ReactNode }

function TabRail({ tabs, active, onSelect }: { tabs: Tab[]; active: number; onSelect: (i: number) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Profile view switcher"
      className="flex shrink-0 gap-1.5 overflow-x-auto [scrollbar-width:none] md:flex-col md:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t, i) => {
        const isActive = i === active
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(i)}
            className={cn(
              "whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-foreground/[0.07] font-semibold text-foreground shadow-xs ring-1 ring-border/60"
                : "font-medium text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Preview Stack ───────────────────────────────────────────────── */
function PreviewStack({ tabs, active }: { tabs: Tab[]; active: number }) {
  return (
    <div className="relative w-full min-w-0 md:flex-1">
      {tabs.map((t, i) => {
        const isActive = i === active
        return (
          <div
            key={t.id}
            role="tabpanel"
            aria-hidden={!isActive}
            className={cn(
              "transition-opacity duration-500",
              isActive ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
            )}
          >
            {t.panel}
          </div>
        )
      })}
    </div>
  )
}

/* ── Hero ────────────────────────────────────────────────────────── */
const SCROLL_LENGTH = "320vh"

export function LandingHero() {
  const sectionRef = React.useRef<HTMLElement>(null)
  const [active, setActive] = React.useState(0)
  const [scrollDriven, setScrollDriven] = React.useState(false)

  const tabs: Tab[] = [
    { id: "learner", label: "Learner Profile", panel: <LearnerProfilePanel /> },
    { id: "institution", label: "Institution View", panel: <InstitutionDashboardPanel /> },
    { id: "employer", label: "Employer Match", panel: <EmployerMatchPanel /> },
    { id: "data", label: "Data Sources", panel: <DataSourcesPanel /> },
  ]

  useIsomorphicLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const apply = () => setScrollDriven(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  })

  useMotionValueEvent(scrollYProgress, "change", (p: number) => {
    if (!scrollDriven) return
    const n = tabs.length
    const i = Math.min(n - 1, Math.max(0, Math.floor(p * n - 1e-6)))
    setActive((prev) => (prev === i ? prev : i))
  })

  const handleSelect = (i: number) => {
    const el = sectionRef.current
    if (scrollDriven && el) {
      const top = window.scrollY + el.getBoundingClientRect().top
      const range = el.offsetHeight - window.innerHeight
      const target = top + ((i + 0.5) / tabs.length) * range
      window.scrollTo({ top: Math.max(0, target), behavior: "smooth" })
    } else {
      setActive(i)
    }
  }

  /* Social proof logos */
  const logos = ["Moodle", "Canvas", "PostgreSQL", "Google Sheets", "Projex", "ERP Systems"]

  return (
    <section
      ref={sectionRef}
      id="product"
      aria-label="Hero"
      className="relative w-full bg-background"
      style={scrollDriven ? { height: SCROLL_LENGTH } : undefined}
    >
      {/* Ambient background gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute top-1/3 right-0 h-[400px] w-[500px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[400px] rounded-full bg-violet-500/[0.03] blur-[100px]" />
      </div>

      <div
        className={cn(
          scrollDriven && "sticky top-0 flex h-screen flex-col overflow-hidden"
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-7xl flex-col justify-center px-6 py-12 lg:py-16",
            scrollDriven && "min-h-0 flex-1"
          )}
        >
          <div className="flex flex-col-reverse items-center justify-center gap-10 md:flex-row md:items-start md:gap-8 lg:gap-14">

            {/* Left: tab rail + preview panel */}
            <div className="flex w-full flex-col gap-5 md:w-[420px] md:shrink-0 md:flex-row md:gap-4 lg:w-[460px]">
              <TabRail tabs={tabs} active={active} onSelect={handleSelect} />
              <PreviewStack tabs={tabs} active={active} />
            </div>

            {/* Right: headline + CTAs */}
            <div className="flex min-w-0 max-w-xl flex-col items-center text-center md:flex-1 md:items-start md:text-left">

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 py-1 pl-2 pr-3.5"
              >
                <span className="inline-flex h-4 items-center rounded-md bg-primary px-1.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
                  NEW
                </span>
                <span className="text-xs font-medium text-primary">Beyond the resume · Learner Intelligence Platform</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.2rem] xl:text-[3.6rem] xl:leading-[1.1]"
              >
                The profile that reveals{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-primary">who they really are</span>
                  <motion.span
                    className="absolute -inset-x-1 -inset-y-0.5 -z-0 rounded-lg bg-primary/10"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.7, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformOrigin: "left center" }}
                  />
                </span>
              </motion.h1>

              {/* Subhead */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="mt-5 text-balance text-base text-muted-foreground lg:text-lg leading-relaxed"
              >
                Connect every system your institution uses — LMS, ERP, projects, mentorship — and let AI surface the signals that actually matter. No more identical resumes.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start"
              >
                <Link
                  href="/login"
                  className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6 text-sm font-semibold gap-2 group")}
                >
                  Get started free
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "rounded-full px-6 text-sm font-medium text-muted-foreground hover:text-foreground")}
                >
                  See how it works
                </Link>
              </motion.div>

              {/* Social proof avatars */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-8 flex flex-col items-center gap-3 md:flex-row"
              >
                <div className="flex items-center">
                  {["SK", "MR", "AP", "JK", "NV"].map((initials, i) => (
                    <span
                      key={initials}
                      className={cn(
                        "flex size-7 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted text-[9px] font-semibold text-muted-foreground",
                        i > 0 && "-ml-2"
                      )}
                    >
                      {initials}
                    </span>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground md:ml-1">
                  Trusted by <strong className="text-foreground font-semibold">500+</strong> institutions
                </span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Logo strip — systems we connect */}
        <div className="border-t border-border/40">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-center overflow-x-auto py-4 [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden">
              <p className="mr-6 shrink-0 text-xs font-medium text-muted-foreground whitespace-nowrap">
                Connects with
              </p>
              <div className="flex items-center gap-6 lg:gap-8">
                {logos.map((logo, i) => (
                  <React.Fragment key={logo}>
                    <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                      {logo}
                    </span>
                    {i < logos.length - 1 && (
                      <div aria-hidden className="h-4 w-px shrink-0 bg-border/50" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
