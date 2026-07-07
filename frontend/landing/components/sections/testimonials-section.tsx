"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { cn } from "@/lib/utils"

const TESTIMONIALS = [
  {
    quote:
      "Profiler finally gave us a single view of our learners. We used to manually compile data from five different systems every placement cycle. Now it's all there, verified and ready.",
    name: "Dr. Priya Sharma",
    role: "Dean of Placements",
    institution: "VTU affiliated college, Karnataka",
    initials: "PS",
    color: "bg-violet-500/20 text-violet-700 dark:text-violet-400",
  },
  {
    quote:
      "The 'Agency' and 'Reliability' metrics became our primary shortlisting criteria. Companies trust them because they're verified by actual mentors, not self-reported.",
    name: "Rajesh Kumar",
    role: "Chief Placement Officer",
    institution: "Private engineering college, Bangalore",
    initials: "RK",
    color: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  },
  {
    quote:
      "Our learners were tired of resumes that didn't represent who they actually are. Profiler gave them a profile they're proud to share — and it's backed by data.",
    name: "Aisha Nair",
    role: "Student Success Lead",
    institution: "Ed-tech platform, Mumbai",
    initials: "AN",
    color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  },
  {
    quote:
      "Setup took under an hour. The AI schema mapper understood our Moodle structure instantly and started pulling attendance and grade data with zero manual work.",
    name: "Suresh Menon",
    role: "IT Head",
    institution: "Autonomous institution, Hyderabad",
    initials: "SM",
    color: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  },
  {
    quote:
      "We shortlist from Profiler now. The context — which cohort, what environment, who verified it — tells us so much more than a GPA ever could.",
    name: "Nisha Patel",
    role: "HR Lead, Early Careers",
    institution: "Mid-size technology company",
    initials: "NP",
    color: "bg-rose-500/20 text-rose-700 dark:text-rose-400",
  },
  {
    quote:
      "The transposition feature blew us away. We could see how a learner from a university environment would perform in our startup context. That's never been possible before.",
    name: "Farhan Sheikh",
    role: "Co-founder",
    institution: "B2B SaaS startup, Pune",
    initials: "FS",
    color: "bg-primary/20 text-primary",
  },
  {
    quote:
      "Finally a platform that treats learner data as a serious product. The derivation engine is genuinely clever — it surfaces patterns I would have missed manually.",
    name: "Meena Krishnaswamy",
    role: "Learning Analytics Director",
    institution: "State university, Tamil Nadu",
    initials: "MK",
    color: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
  },
  {
    quote:
      "Our students' placement rates improved by 34% in one cycle. When employers can see verified reliability scores, the shortlisting conversation changes completely.",
    name: "Kiran Rao",
    role: "TPO",
    institution: "Tier-2 engineering college, Mysore",
    initials: "KR",
    color: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  },
  {
    quote:
      "I used to spend weeks building placement reports. Profiler generates them instantly, with more depth and accuracy than anything I could do manually.",
    name: "Divya Reddy",
    role: "Placement Coordinator",
    institution: "Deemed university, Andhra Pradesh",
    initials: "DR",
    color: "bg-teal-500/20 text-teal-700 dark:text-teal-400",
  },
]

interface TestimonialCardProps {
  quote: string
  name: string
  role: string
  institution: string
  initials: string
  color: string
}

function TestimonialCard({ quote, name, role, institution, initials, color }: TestimonialCardProps) {
  return (
    <div className="w-full rounded-2xl border border-border/50 bg-card p-5 shadow-xs">
      <p className="text-sm leading-relaxed text-foreground/80">"{quote}"</p>
      <div className="mt-4 flex items-center gap-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
            color
          )}
        >
          {initials}
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">{name}</p>
          <p className="text-[10px] text-muted-foreground">{role}</p>
          <p className="text-[10px] text-muted-foreground/70">{institution}</p>
        </div>
      </div>
    </div>
  )
}

function ScrollingColumn({
  testimonials,
  duration,
  reverse = false,
  className,
}: {
  testimonials: TestimonialCardProps[]
  duration: number
  reverse?: boolean
  className?: string
}) {
  const items = [...testimonials, ...testimonials] // duplicate for seamless loop

  return (
    <div className={cn("flex flex-col gap-4 overflow-hidden", className)}>
      <motion.div
        className="flex flex-col gap-4"
        animate={{ y: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
      >
        {items.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} {...t} />
        ))}
      </motion.div>
    </div>
  )
}

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-60px" })

  const col1 = TESTIMONIALS.slice(0, 3)
  const col2 = TESTIMONIALS.slice(3, 6)
  const col3 = TESTIMONIALS.slice(6, 9)

  return (
    <section className="relative overflow-hidden bg-background px-6 py-24 sm:py-32">
      {/* Background radial tint */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.03] blur-[120px]" />
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
            Testimonials
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Trusted by institutions, loved by learners
          </h2>
          <p className="mt-4 text-base text-muted-foreground lg:text-lg leading-relaxed">
            From placement officers to HR leads, Profiler changes how people think about learner data.
          </p>
        </motion.div>

        {/* Testimonial columns */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-14 flex justify-center gap-4 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[560px] overflow-hidden"
        >
          <ScrollingColumn testimonials={col1} duration={22} className="w-full max-w-xs" />
          <ScrollingColumn testimonials={col2} duration={28} reverse className="hidden md:flex w-full max-w-xs" />
          <ScrollingColumn testimonials={col3} duration={25} className="hidden lg:flex w-full max-w-xs" />
        </motion.div>
      </div>
    </section>
  )
}
