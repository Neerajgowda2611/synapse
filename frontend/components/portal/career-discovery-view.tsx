"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type {
  CareerDiscoveryResponse,
  CareerDiscoveryRole,
} from "@/lib/profiling/career-discovery-types"

type CareerDiscoveryViewProps = {
  data: CareerDiscoveryResponse
}

function sortRoles(roles: CareerDiscoveryRole[], sortId: string): CareerDiscoveryRole[] {
  const sorted = [...roles]

  if (sortId === "role_title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title))
  }

  return sorted.sort((a, b) => b.match_score - a.match_score)
}

function RoleDiscoveryCard({
  role,
  addToProfileLabel,
}: {
  role: CareerDiscoveryRole
  addToProfileLabel: string
}) {
  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {role.category}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{role.title}</h2>
          <div className="flex flex-wrap gap-2">
            {role.skills.map((skill) => (
              <Badge
                key={skill}
                variant="outline"
                className="rounded-md text-[10px] font-medium uppercase tracking-wide"
              >
                {skill}
              </Badge>
            ))}
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {role.description}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end justify-between gap-8 sm:min-h-[180px] sm:pl-6">
          <div className="text-right">
            <p className="text-4xl font-bold tracking-tight text-foreground">{role.match_score}%</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              &bull; {role.match_label}
            </p>
          </div>
          <Button variant="link" className="h-auto cursor-pointer p-0 text-sm font-medium">
            {addToProfileLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function CareerDiscoveryView({ data }: CareerDiscoveryViewProps) {
  const [sortId, setSortId] = useState(data.sort.default_option_id)

  const sortedRoles = useMemo(() => sortRoles(data.roles, sortId), [data.roles, sortId])
  const activeSort =
    data.sort.options.find((option) => option.id === sortId) ?? data.sort.options[0]

  return (
    <div className="space-y-6 **:data-[slot=accordion-trigger]:cursor-pointer **:data-[slot=dropdown-menu-item]:cursor-pointer **:data-[slot=dropdown-menu-trigger]:cursor-pointer **:data-[slot=tabs-trigger]:cursor-pointer [&_a]:cursor-pointer [&_button]:cursor-pointer **:[[role=menuitem]]:cursor-pointer **:[[role=tab]]:cursor-pointer">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="shrink-0">{data.sort.label}:</span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 min-w-36 cursor-pointer justify-between gap-2 border-primary px-3 font-medium text-primary hover:bg-primary/10! hover:text-primary! aria-expanded:bg-primary/10! aria-expanded:text-primary!"
                >
                  <span className="truncate">{activeSort.label}</span>
                  <ChevronDown className="size-4 shrink-0 opacity-60" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40 p-2">
              <DropdownMenuGroup className="space-y-0.5">
                {data.sort.options.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    className={cn(
                      "cursor-pointer px-3 py-2 hover:bg-primary/10! hover:text-primary! focus:bg-primary/10! focus:text-primary! not-data-[variant=destructive]:hover:**:text-primary! not-data-[variant=destructive]:focus:**:text-primary!",
                      sortId === option.id && "bg-primary/10 font-medium text-primary"
                    )}
                    onClick={() => setSortId(option.id)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-4">
        {sortedRoles.map((role) => (
          <RoleDiscoveryCard
            key={role.id}
            role={role}
            addToProfileLabel={data.add_to_profile_label}
          />
        ))}
      </div>
    </div>
  )
}
