import type { Filter } from 'pixi.js'

import type { ParamValue } from '../symptoms/types'

// every symptom filter has to have these two functions
export interface SymptomFilter {
  // makes a new pixi filter (runs once per layer)
  create: () => Filter
  // copies the slider values from the symptom panel into the filter
  update: (filter: Filter, values: Record<string, ParamValue>) => void
}

// uses the value if it's a number, otherwise uses the fallback
export function numberOr(value: ParamValue | undefined, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}
