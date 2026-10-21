import { defaultFilterVert, Filter, GlProgram } from 'pixi.js'

import diplopiaFrag from './shaders/diplopia.frag?raw'
import { numberOr, type SymptomFilter } from './symptomFilter'

// double vision, shows a faded copy of the picture moved over a bit
export const diplopiaFilter: SymptomFilter = {
  // makes a pixi filter out of the diplopia shader (same setup as the shader sandbox)
  create() {
    return new Filter({
      glProgram: new GlProgram({ vertex: defaultFilterVert, fragment: diplopiaFrag, name: 'diplopia' }),
      resources: {
        symptomUniforms: {
          u_offset: { value: 0.02, type: 'f32' },
          u_angle: { value: 0, type: 'f32' },
          u_opacity: { value: 0.5, type: 'f32' },
        },
      },
    })
  },

  // the sliders use percents so they're easier to read, the shader wants 0 to 1
  update(filter, values) {
    const uniforms = filter.resources.symptomUniforms.uniforms

    uniforms.u_angle = numberOr(values.angle, 0)
    uniforms.u_offset = numberOr(values.offset, 2) / 100
    uniforms.u_opacity = numberOr(values.opacity, 50) / 100
  },
}
