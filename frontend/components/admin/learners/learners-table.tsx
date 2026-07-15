"use client"

import { Eye } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { VirtualizedTableBody } from "@/components/ui/virtualized-table-body"
import type { LearnerRow } from "@/lib/admin/load-learners"

type LearnersTableProps = {
  learners: LearnerRow[]
  onPreview: (learner: LearnerRow) => void
}

function statusVariant(status: LearnerRow["status"]) {
  switch (status) {
    case "profiled":
      return "default"
    case "registered":
      return "secondary"
    default:
      return "outline"
  }
}

function LearnerRowCells({
  learner,
  onPreview,
}: {
  learner: LearnerRow
  onPreview: (learner: LearnerRow) => void
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-0.5">
          <p className="font-medium">{learner.name}</p>
          <p className="text-xs text-muted-foreground">
            {learner.email ?? learner.externalId ?? "No identifier"}
          </p>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{learner.sourceLabel ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={statusVariant(learner.status)} className="capitalize">
          {learner.status}
        </Badge>
      </TableCell>
      <TableCell className="tabular-nums">
        {learner.profileStrength != null && learner.profileStrength > 0
          ? `${learner.profileStrength}%`
          : learner.traitCount != null && learner.traitCount > 0
            ? `${learner.traitCount} traits`
            : "—"}
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPreview(learner)}
          disabled={!learner.userId}
          aria-label={`Preview profile for ${learner.name}`}
        >
          <Eye className="size-4" aria-hidden />
          Preview
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function LearnersTable({ learners, onPreview }: LearnersTableProps) {
  if (learners.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
        <h2 className="text-lg font-medium">No learners yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Learners appear after you import records from connected data sources or register learner
          accounts for your institution.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Learner</TableHead>
            <TableHead className="hidden sm:table-cell">Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Profile</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <VirtualizedTableBody
            rows={learners}
            rowKey={(learner) => learner.id}
            renderRow={(learner) => (
              <LearnerRowCells learner={learner} onPreview={onPreview} />
            )}
          />
        </TableBody>
      </Table>
    </div>
  )
}
