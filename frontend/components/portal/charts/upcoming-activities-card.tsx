"use client"

import { addDays, format } from "date-fns"
import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export type UpcomingActivity = {
  id: string
  title: string
  time: string
  type: string
  dayOffset: number
}

type UpcomingActivitiesCardProps = {
  activities: UpcomingActivity[]
  title?: string
}

export function UpcomingActivitiesCard({
  activities,
  title = "Upcoming Activities",
}: UpcomingActivitiesCardProps) {
  const today = new Date()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardAction className="flex items-center gap-1 text-xs text-muted-foreground">
          View Calendar <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No upcoming activities yet.</p>
        ) : (
          activities.map((activity) => {
            const eventDate = addDays(today, activity.dayOffset)
            return (
              <div key={activity.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="size-11 shrink-0 overflow-hidden rounded-sm border">
                    <div className="grid h-1/3 place-items-center border-b bg-muted text-[10px] font-medium uppercase leading-none">
                      {format(eventDate, "MMM")}
                    </div>
                    <div className="grid h-2/3 place-items-center text-lg leading-none">
                      {format(eventDate, "d")}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="truncate text-sm font-medium leading-none">{activity.title}</div>
                    <div className="text-xs leading-none text-muted-foreground">{activity.time}</div>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-medium">
                  {activity.type}
                </Badge>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
