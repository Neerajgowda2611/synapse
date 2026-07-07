import Link from "next/link"
import { Globe, Mail, ExternalLink } from "lucide-react"

const LINKS = [
  {
    title: "Product",
    items: [
      { label: "Features", href: "#product" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Integrations", href: "#integrations" },
    ],
  },
  {
    title: "Platform",
    items: [
      { label: "For Institutions", href: "#audiences" },
      { label: "For Learners", href: "#audiences" },
      { label: "For Employers", href: "#audiences" },
    ],
  },
  {
    title: "Suite",
    items: [
      { label: "Projex", href: "#" },
      { label: "Mentorship", href: "#" },
      { label: "VTU Placements", href: "#" },
      { label: "Xcelerator", href: "#" },
    ],
  },
]

const SOCIAL = [
  { icon: Globe, label: "Website", href: "#" },
  { icon: Mail, label: "Email", href: "mailto:contact@xcelerator.co.in" },
  { icon: ExternalLink, label: "LinkedIn", href: "https://www.linkedin.com/school/xceler/" },
]

export function LandingFooter() {
  return (
    <footer className="relative border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 flex flex-col gap-4 sm:col-span-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
                P
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">Profiler</p>
                <p className="text-[10px] text-muted-foreground">by Xcelerator</p>
              </div>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              The Learner Intelligence Platform. Multi-source, AI-powered, credential-first profiles that capture who learners actually are — not just their history.
            </p>
            <div className="flex items-center gap-2">
              {SOCIAL.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-8 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground transition-all hover:border-primary/40 hover:text-primary hover:scale-110"
                >
                  <Icon className="size-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 sm:flex-row">
          <p className="text-[11px] text-muted-foreground">
            &copy; {new Date().getFullYear()} Xcelerator. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link href="#" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
