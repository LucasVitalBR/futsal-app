export const ATTRIBUTE_LABELS = {
  pace: 'Ritmo',
  shooting: 'Finalização',
  passing: 'Passe',
  dribbling: 'Drible',
  defending: 'Defesa',
  physical: 'Físico',
}

export const ATTRIBUTE_ORDER = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

const MIN_ATTRIBUTE_VALUE = 40
const MAX_ATTRIBUTE_VALUE = 120

export function computeOverall(attributes) {
  const values = ATTRIBUTE_ORDER.map((key) =>
    Math.max(MIN_ATTRIBUTE_VALUE, Math.min(MAX_ATTRIBUTE_VALUE, attributes?.[key] ?? MIN_ATTRIBUTE_VALUE)),
  )
  const average = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.max(MIN_ATTRIBUTE_VALUE, Math.min(MAX_ATTRIBUTE_VALUE, Math.round(average)))
}
