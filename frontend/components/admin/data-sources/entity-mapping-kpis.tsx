import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type EntityMappingKpisProps = {
  total: number
  mapped: number
  skipped: number
}

export function EntityMappingKpis({ total, mapped, skipped }: EntityMappingKpisProps) {
  const items = [
    { label: "Total sources", value: total },
    { label: "Mapped", value: mapped },
    { label: "Skipped", value: skipped },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
