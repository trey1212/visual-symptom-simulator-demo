// Shape of a symptom definition as served by the backend filter library.
// Each parameter maps 1:1 to a uniform in the symptom's fragment shader.

export type ParamKind = 'range' | 'position' | 'toggle' | 'color' | 'select'

interface BaseParam {
  /** Key used in the UI state and as the shader uniform name (prefixed with `u_`). */
  key: string
  label: string
  kind: ParamKind
}

export interface RangeParam extends BaseParam {
  kind: 'range'
  min: number
  max: number
  step: number
  default: number
  unit?: string
}

/** A draggable point on the image, in normalized 0..1 coordinates. */
export interface PositionParam extends BaseParam {
  kind: 'position'
  default: { x: number; y: number }
}

export interface ToggleParam extends BaseParam {
  kind: 'toggle'
  default: boolean
}

export interface ColorParam extends BaseParam {
  kind: 'color'
  default: [number, number, number]
}

export interface SelectParam extends BaseParam {
  kind: 'select'
  options: { value: number; label: string }[]
  default: number
}

export type SymptomParam = RangeParam | PositionParam | ToggleParam | ColorParam | SelectParam

export interface SymptomDefinition {
  /** Stable identifier, also the shader file name (e.g. `blur` -> shaders/blur.frag). */
  id: string
  name: string
  description: string
  category: string
  /** Animated symptoms need a continuous render loop (u_time). */
  animated: boolean
  params: SymptomParam[]
}

export type ParamValue = number | boolean | { x: number; y: number } | [number, number, number]

/** One active symptom in the user's stack. */
export interface SymptomLayer {
  instanceId: string
  symptomId: string
  enabled: boolean
  values: Record<string, ParamValue>
}
