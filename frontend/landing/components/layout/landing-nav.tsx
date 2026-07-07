"use client"

import Link from "next/link"
import { Menu, X, Sun, Moon } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { landingNavigation } from "@/landing/lib/constants"

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && resolvedTheme === "dark"

  return (
    <motion.button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative w-[46px] h-[24px] rounded-full cursor-pointer",
        "bg-foreground/8 hover:bg-foreground/12",
        "border border-border/20 transition-colors duration-200"
      )}
      whileTap={{ scale: 0.95 }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <motion.div
        className="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-foreground shadow-xs flex items-center justify-center"
        animate={{ x: isDark ? 22 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              exit={{ rotate: 90, scale: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Moon className="w-[9px] h-[9px] text-background" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              exit={{ rotate: -90, scale: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sun className="w-[9px] h-[9px] text-background" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.button>
  )
}

export function MarketingNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState("product")

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const ids = landingNavigation.map((item) => item.href.replace("#", "")).filter(Boolean)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: "-40% 0px -45% 0px" }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div
        className={cn(
          "mx-auto max-w-7xl rounded-[1.4rem] border px-4 py-3 transition-all duration-500 sm:px-6",
          scrolled
            ? "border-border/50 bg-background/85 shadow-sm backdrop-blur-xl"
            : "border-transparent bg-background/60 backdrop-blur-md"
        )}
      >
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background shadow-xs">
              P
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-tight text-foreground leading-none">Profiler</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">by Xcelerator</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {landingNavigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  activeSection === item.href.replace("#", "")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {activeSection === item.href.replace("#", "") && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-foreground/[0.06]"
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <ThemeToggle />
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex rounded-full text-sm font-medium")}
            >
              Log in
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "sm" }), "rounded-full text-sm font-medium px-4")}
            >
              Get started
            </Link>
            {/* Mobile menu toggle */}
            <button
              className="flex size-9 items-center justify-center rounded-full border border-border/30 bg-background/50 text-foreground lg:hidden"
              onClick={() => setIsOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="overflow-hidden lg:hidden"
            >
              <div className="space-y-1 border-t border-border/20 pt-4">
                {landingNavigation.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.04]"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="grid gap-2 pt-3">
                  <Link
                    href="/login"
                    className={cn(buttonVariants({ variant: "outline", size: "default" }), "w-full rounded-full")}
                  >
                    Log in
                  </Link>
                  <Link
                    href="#final-cta"
                    className={cn(buttonVariants({ size: "default" }), "w-full rounded-full")}
                    onClick={() => setIsOpen(false)}
                  >
                    Get started free
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
