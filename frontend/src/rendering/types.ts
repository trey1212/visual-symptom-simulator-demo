import type { SymptomLayer } from '../symptoms/types'

// The renderer applies an ordered stack of symptom layers to a base image.
// Each enabled layer is one fragment-shader pass (ping-ponging framebuffers).
export interface Renderer {
  setImage(source: TexImageSource): void
  render(layers: SymptomLayer[], timeSeconds: number): void
  /** Export the current output at the source image's full resolution. */
  toBlob(type?: 'image/png' | 'image/jpeg'): Promise<Blob>
  dispose(): void
}
