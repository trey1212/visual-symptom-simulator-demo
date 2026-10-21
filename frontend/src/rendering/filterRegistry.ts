import { diplopiaFilter } from './diplopiaFilter'
import type { SymptomFilter } from './symptomFilter'

// symptom id -> its filter, add a line here when a new shader is ready
// symptoms that aren't in here yet just get skipped on the canvas
export const symptomFilters: Partial<Record<string, SymptomFilter>> = {
  diplopia: diplopiaFilter,
}
