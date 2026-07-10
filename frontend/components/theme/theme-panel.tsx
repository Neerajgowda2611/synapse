"use client"

import { useState } from "react"
import { Palette, RotateCcw } from "lucide-react"
import { useShallow } from "zustand/react/shallow"

import { ThemeAppearanceSwitch } from "@/components/theme/theme-appearance-switch"
import { ThemeCard } from "@/components/theme/theme-card"
import { ThemeLivePreview } from "@/components/theme/theme-live-preview"
import { RadiusPicker } from "@/components/theme/radius-picker"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { COLOR_THEME_OPTIONS, type ColorThemeId } from "@/lib/themes/color-themes"
import { usePreferencesStore } from "@/stores/preferences/preferences-provider"
import { cn } from "@/lib/utils"

type ThemePanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemePanel({ open, onOpenChange }: ThemePanelProps) {
  const isMobile = useIsMobile()
  const { colorTheme, setPreference, resetPreferences } = usePreferencesStore(
    useShallow((state) => ({
      colorTheme: state.values.color_theme,
      setPreference: state.setPreference,
      resetPreferences: state.resetPreferences,
    }))
  )

  function handleReset() {
    resetPreferences()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile ? "h-[90dvh] max-h-[90dvh] rounded-t-2xl" : "w-[380px] max-w-[380px]"
        )}
      >
        <SheetHeader className="shrink-0 border-b px-4 py-3 pr-12 text-left">
          <SheetTitle className="text-sm font-semibold">Personalize</SheetTitle>
          <SheetDescription className="text-xs">
            Color themes work alongside Studio presets in layout settings.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-5">
            <section>
              <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Color theme
              </p>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_THEME_OPTIONS.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isActive={colorTheme === theme.id}
                    onSelect={(id) => setPreference("color_theme", id as ColorThemeId)}
                  />
                ))}
              </div>
            </section>

            <Separator />

            <section>
              <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Appearance
              </p>
              <ThemeAppearanceSwitch />
            </section>

            <Separator />

            <section>
              <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Corner style
              </p>
              <RadiusPicker />
            </section>

            <Separator />

            <section>
              <p className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Preview
              </p>
              <ThemeLivePreview />
            </section>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ThemePanelTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label="Open theme personalization panel"
        onClick={() => setOpen(true)}
      >
        <Palette className="size-4" />
      </Button>
      <ThemePanel open={open} onOpenChange={setOpen} />
    </>
  )
}
