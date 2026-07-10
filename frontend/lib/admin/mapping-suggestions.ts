import type { SchemaSnapshot } from "@/lib/api/data-sources"

export type MappingSuggestion = {
  id: string
  sourceField: string
  targetField: string
  confidence: number
  rationale: string
}

type SuggestionRule = {
  pattern: RegExp
  target: string
  confidence: number
  rationale: string
}

const RULES: SuggestionRule[] = [
  {
    pattern: /(full_?name|student_?name|std_?nm|learner_?name|name)/i,
    target: "identity.full_name",
    confidence: 96,
    rationale: "Name-like column label",
  },
  {
    pattern: /(email|mail)/i,
    target: "identity.email",
    confidence: 99,
    rationale: "Email column label",
  },
  {
    pattern: /(student_?id|learner_?id|roll_?no|external_?id)/i,
    target: "identity.external_id",
    confidence: 94,
    rationale: "Identifier column label",
  },
  {
    pattern: /(phone|mobile|contact)/i,
    target: "identity.phone",
    confidence: 88,
    rationale: "Contact column label",
  },
  {
    pattern: /(attendance|present|absent)/i,
    target: "attendance.status",
    confidence: 91,
    rationale: "Attendance domain keyword",
  },
  {
    pattern: /(score|marks|grade|result)/i,
    target: "assessments.score",
    confidence: 90,
    rationale: "Assessment metric keyword",
  },
  {
    pattern: /(skill|competency|proficiency)/i,
    target: "skills.label",
    confidence: 87,
    rationale: "Skills domain keyword",
  },
  {
    pattern: /(project|repo|github)/i,
    target: "projects.title",
    confidence: 85,
    rationale: "Project domain keyword",
  },
  {
    pattern: /(placement|offer|company)/i,
    target: "placement.company_name",
    confidence: 86,
    rationale: "Placement domain keyword",
  },
  {
    pattern: /(occurred|created|updated|timestamp|date)/i,
    target: "identity.occurred_at",
    confidence: 82,
    rationale: "Temporal column label",
  },
]

function suggestForField(sourceField: string): MappingSuggestion | null {
  const column = sourceField.includes(".") ? sourceField.split(".").pop() ?? sourceField : sourceField

  for (const rule of RULES) {
    if (!rule.pattern.test(column)) continue
    return {
      id: sourceField,
      sourceField,
      targetField: rule.target,
      confidence: rule.confidence,
      rationale: rule.rationale,
    }
  }

  return null
}

export function buildMappingSuggestions(snapshot: SchemaSnapshot | null): MappingSuggestion[] {
  if (!snapshot) return []

  const fields =
    snapshot.schema_json.tables.flatMap((table) =>
      table.columns.map((column) => `${table.name}.${column.name}`)
    ) ?? []

  const suggestions: MappingSuggestion[] = []
  const seenTargets = new Set<string>()

  for (const field of fields) {
    const suggestion = suggestForField(field)
    if (!suggestion || seenTargets.has(suggestion.targetField)) continue
    seenTargets.add(suggestion.targetField)
    suggestions.push(suggestion)
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence)
}
