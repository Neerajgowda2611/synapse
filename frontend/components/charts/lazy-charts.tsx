"use client"

import dynamic from "next/dynamic"

import { ChartSkeleton } from "@/components/ui/chart-skeleton"

const chartLoading = () => <ChartSkeleton />

export const LazyCompetencyPerformanceChart = dynamic(
  () =>
    import("@/components/portal/charts/competency-performance-chart").then((module) => ({
      default: module.CompetencyPerformanceChart,
    })),
  { loading: chartLoading }
)

export const LazyCompetencyStatusChart = dynamic(
  () =>
    import("@/components/portal/charts/competency-status-chart").then((module) => ({
      default: module.CompetencyStatusChart,
    })),
  { loading: chartLoading }
)

export const LazyRoleFitGauge = dynamic(
  () =>
    import("@/components/portal/charts/role-fit-gauge").then((module) => ({
      default: module.RoleFitGauge,
    })),
  { loading: chartLoading }
)

export const LazyTraitAllocationChart = dynamic(
  () =>
    import("@/components/portal/charts/trait-allocation-chart").then((module) => ({
      default: module.TraitAllocationChart,
    })),
  { loading: chartLoading }
)

export const LazyStreamActivityChart = dynamic(
  () =>
    import("@/components/portal/charts/stream-activity-chart").then((module) => ({
      default: module.StreamActivityChart,
    })),
  { loading: chartLoading }
)

export const LazyMatchDistributionChart = dynamic(
  () =>
    import("@/components/portal/charts/match-distribution-chart").then((module) => ({
      default: module.MatchDistributionChart,
    })),
  { loading: chartLoading }
)

export const LazyIngestionTrendChart = dynamic(
  () =>
    import("@/components/admin/analytics/ingestion-trend-chart").then((module) => ({
      default: module.IngestionTrendChart,
    })),
  { loading: chartLoading }
)
