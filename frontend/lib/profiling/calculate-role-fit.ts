import type { Competency, Role, RoleFitFormula } from "./types"

function competencyScoreMap(competencies: Competency[]): Map<string, number> {
  return new Map(competencies.map((c) => [c.id, c.score]))
}

function calculateWeightedAverage(
  formula: Extract<RoleFitFormula, { type: "weighted_average" }>,
  scores: Map<string, number>
): number {
  let weightedSum = 0
  let totalWeight = 0

  for (const operand of formula.operands) {
    const score = scores.get(operand.competency_id)
    if (score === undefined) continue
    weightedSum += score * operand.weight
    totalWeight += operand.weight
  }

  if (totalWeight === 0) return 0
  return Math.round(weightedSum / totalWeight)
}

function calculateAverage(
  formula: Extract<RoleFitFormula, { type: "average" }>,
  scores: Map<string, number>
): number {
  const values = formula.competency_ids
    .map((id) => scores.get(id))
    .filter((score): score is number => score !== undefined)

  if (values.length === 0) return 0
  const sum = values.reduce((acc, score) => acc + score, 0)
  return Math.round(sum / values.length)
}

export function calculateRoleFit(role: Role): number {
  const scores = competencyScoreMap(role.competencies)
  const { role_fit_formula } = role

  switch (role_fit_formula.type) {
    case "weighted_average":
      return calculateWeightedAverage(role_fit_formula, scores)
    case "average":
      return calculateAverage(role_fit_formula, scores)
    default:
      return 0
  }
}
