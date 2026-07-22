import type { Metadata } from "next"
import { TooltipProvider } from "@/components/ui/tooltip"
import { APP_CONFIG } from "@/config/app-config"
import { fontVars } from "@/lib/fonts/registry"
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config"
import { ThemeBootScript } from "@/scripts/theme-boot"
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS

  return (
    <html
      lang="en"
      className={`${fontVars} h-full antialiased`}
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <head>
        <ThemeBootScript />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased">
        <TooltipProvider>
          <PreferencesStoreProvider initialValues={PREFERENCE_DEFAULTS}>
            {children}
          </PreferencesStoreProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
