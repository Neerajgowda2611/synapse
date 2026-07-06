"use client"

import { Briefcase, MessagesSquare, Rocket, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Stream, StreamIcon, ThreeStreamsResponse } from "@/lib/profiling/three-streams-types"

const ICON_MAP: Record<StreamIcon, LucideIcon> = {
  briefcase: Briefcase,
  rocket: Rocket,
  "messages-square": MessagesSquare,
}

type ThreeStreamsViewProps = {
  data: ThreeStreamsResponse
}

type SectionConfig = {
  key: keyof Pick<
    Stream,
    "contributes" | "activities_we_consider" | "what_activities_show" | "recent_highlights"
  >
  label: string
  bulleted: boolean
}

const SECTIONS: SectionConfig[] = [
  { key: "contributes", label: "Contributes", bulleted: true },
  { key: "activities_we_consider", label: "Activities We Consider", bulleted: true },
  { key: "what_activities_show", label: "What These Activities Show", bulleted: true },
  { key: "recent_highlights", label: "Recent Highlights", bulleted: false },
]

function StreamHeader({ stream }: { stream: Stream }) {
  const Icon = ICON_MAP[stream.icon]

  return (
    <div className="flex items-start gap-3">
      <Card className="flex size-10 shrink-0 items-center justify-center bg-foreground py-0 text-background shadow-none ring-0">
        <CardContent className="flex items-center justify-center p-0">
          <Icon className="size-5" />
        </CardContent>
      </Card>
      <div>
        <p className="text-sm font-bold tracking-wide text-foreground">{stream.label}</p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {stream.subtitle}
        </p>
      </div>
    </div>
  )
}

function StreamListBox({
  items,
  bulleted,
}: {
  items: string[]
  bulleted: boolean
}) {
  if (bulleted) {
    return (
      <Card className="h-full bg-muted/50 py-4 shadow-none">
        <CardContent className="px-4">
          <ul className="list-disc space-y-2 pl-4 text-sm text-foreground">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full bg-muted/50 py-4 shadow-none">
      <CardContent className="space-y-2 px-4">
        {items.map((item) => (
          <p key={item} className="text-sm text-foreground">
            {item}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}

export function ThreeStreamsView({ data }: ThreeStreamsViewProps) {
  return (
    <Card className="py-8 **:data-[slot=accordion-trigger]:cursor-pointer **:data-[slot=dropdown-menu-item]:cursor-pointer **:data-[slot=dropdown-menu-trigger]:cursor-pointer **:data-[slot=tabs-trigger]:cursor-pointer [&_a]:cursor-pointer [&_button]:cursor-pointer **:[[role=menuitem]]:cursor-pointer **:[[role=tab]]:cursor-pointer">
      <CardHeader className="px-8 pb-6">
        <h1 className="text-xl font-semibold text-foreground">{data.title}</h1>
      </CardHeader>

      <CardContent className="space-y-8 px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {data.streams.map((stream) => (
            <StreamHeader key={stream.id} stream={stream} />
          ))}
        </div>

        {SECTIONS.map((section) => (
          <section key={section.key} className="space-y-4">
            <div className="flex items-center gap-4">
              <p className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {section.label}
              </p>
              <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {data.streams.map((stream) => (
                <StreamListBox
                  key={`${stream.id}-${section.key}`}
                  items={stream[section.key]}
                  bulleted={section.bulleted}
                />
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
