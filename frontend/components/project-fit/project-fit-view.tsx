"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, CircleAlert, CircleCheck, Scale, UserRound } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { AuthLoadingState } from "@/components/auth/auth-page-state"
import { ProgressRing } from "@/components/portal/progress-ring"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getProjectFitDetail,
  type ProjectFitDetailResponse,
  type ProjectFitTraitDetail,
} from "@/lib/api/profiler"
import { ApiError } from "@/lib/api/client"
import { getAccessToken } from "@/lib/config"

function traitLabel(trait: string) {
  return trait
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function ProjectFitError({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/20 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <CircleAlert className="size-5" />
          </div>
          <CardTitle>Unable to open project fit</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="size-4" />
            Go back
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

function TraitFitCard({ trait }: { trait: ProjectFitTraitDetail }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{traitLabel(trait.trait)}</CardTitle>
            <CardDescription>
              {trait.missing
                ? "Profiler does not yet have enough evidence for this trait."
                : `${trait.weight_share_percent}% of this project's scoring weight`}
            </CardDescription>
          </div>
          <Badge variant={trait.missing ? "outline" : "secondary"}>
            {trait.missing ? "Missing data" : `${trait.fit_percent}% trait fit`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Learner level</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{trait.trait_percent}%</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Project importance</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {trait.weight_share_percent}%
            </p>
            <p className="text-xs text-muted-foreground">Weight {trait.weight}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Overall contribution</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {trait.contribution_percent} pts
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Learner profile level</span>
            <span>{trait.trait_percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-chart-2"
              style={{ width: `${clampPercent(trait.trait_percent)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span>{trait.evidence.n_effective.toFixed(1)} effective signals</span>
          <span>{trait.evidence.distinct_signal_types} signal types</span>
          <span>
            Confidence range {Math.round(trait.confidence.lower * 100)}–
            {Math.round(trait.confidence.upper * 100)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProjectFitView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const [data, setData] = useState<ProjectFitDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const returnPath = `/project-fit?token=${encodeURIComponent(token)}`
    if (!getAccessToken()) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(returnPath)}`)
      return
    }

    getProjectFitDetail(token)
      .then(setData)
      .catch((requestError) => {
        if (requestError instanceof ApiError && requestError.status === 401) {
          router.replace(`/login?callbackUrl=${encodeURIComponent(returnPath)}`)
          return
        }
        if (requestError instanceof ApiError && requestError.status === 410) {
          setError("This link has expired. Return to Projex and refresh the candidate scores.")
          return
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "The project-fit profile could not be loaded."
        )
      })
  }, [router, token])

  if (!token) return <ProjectFitError message="This project-fit link is incomplete." />
  if (error) return <ProjectFitError message={error} />
  if (!data) return <AuthLoadingState title="Loading project fit" />

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <Button variant="ghost" className="-ml-3" onClick={() => window.history.back()}>
          <ArrowLeft className="size-4" />
          Back to Projex
        </Button>

        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 py-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="space-y-4">
              <Badge variant="outline">Project fit profile</Badge>
              <div>
                <p className="text-sm text-muted-foreground">{data.project_name}</p>
                <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
                  {data.learner.name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{data.learner.email}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <UserRound className="size-4" />
                  Learner profile
                </span>
                <span className="flex items-center gap-1.5">
                  <Scale className="size-4" />
                  {data.traits.length} weighted traits
                </span>
                {data.missing_traits.length === 0 ? (
                  <span className="flex items-center gap-1.5 text-chart-2">
                    <CircleCheck className="size-4" />
                    All selected traits available
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl bg-muted/40 p-4">
              <ProgressRing value={data.fit_percent} size={104} strokeWidth={8}>
                <span className="text-xl font-semibold tabular-nums">{data.fit_percent}%</span>
              </ProgressRing>
              <div className="max-w-40">
                <p className="font-medium">Overall project fit</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confidence {Math.round(data.confidence.lower * 100)}–
                  {Math.round(data.confidence.upper * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-heading text-xl font-semibold">Why this fit score</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The learner profile is compared only with the traits and weights selected for this
            project.
          </p>
        </div>

        <div className="grid gap-4">
          {data.traits.map((trait) => (
            <TraitFitCard key={trait.trait} trait={trait} />
          ))}
        </div>
      </div>
    </main>
  )
}
