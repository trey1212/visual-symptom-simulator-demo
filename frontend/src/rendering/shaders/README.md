One fragment shader per symptom, named `<symptom-id>.frag`.

Each one runs as a PixiJS `Filter` (WebGL2) paired with Pixi's `defaultFilterVert`. Write GLSL ES 3.00 style: `texture()` and `out vec4 finalColor`. Pixi adds the `#version` line. [diplopia.frag](diplopia.frag) is a complete example.

Built-in inputs from Pixi (declare the ones you use):

- `in vec2 vTextureCoord`: texture coordinate of this pixel
- `uniform sampler2D uTexture`: output of the previous pass (or the base image)
- `uniform vec4 uInputSize`: xy = input texture size in px, zw = 1 / size
- `uniform vec4 uInputClamp`: texture-coord bounds that contain image pixels (clamp offset samples to this)
- `uniform vec4 uOutputFrame`: zw = size of the filtered area in px

Symptom-specific parameters arrive as `u_<paramKey>` (see `src/symptoms/types.ts`). Animated symptoms also get `float u_time` (seconds).

Gotchas:

- Start every shader with `precision highp float;`. The vertex shader's uniforms are `highp`, and Pixi defaults fragments to `mediump`, so a mismatch fails to link ("Could not initialize shader").
- `vTextureCoord` is not 0..1 across the image, because Pixi renders filters into pooled textures that can be larger. For image-space 0..1 coordinates (e.g. `position` params) use `vTextureCoord * uInputSize.xy / uOutputFrame.zw`.
- Pixi textures use premultiplied alpha.

Try shaders at `/sandbox` while running `npm run dev`.

`scotoma.frag` has its own playground at `/sandbox/scotoma`. It uses an aspect-correct elliptical/irregular mask with dim, blur, and blank-patch appearances. Its size is a percentage of the shorter displayed image edge, and its position is normalized to the image. Research and modeling choices are documented in [`SCOTOMA_RESEARCH.md`](../../features/sandbox/SCOTOMA_RESEARCH.md).
