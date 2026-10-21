// Localized loss of detail: an illustrative scotoma, not a visual-field test.
precision highp float;

in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform vec4 uInputClamp;
uniform vec4 uOutputFrame;

uniform float u_x;
uniform float u_y;
uniform float u_size;       // Diameter as a percentage of the shorter image edge.
uniform float u_aspect;     // Ellipse width / height; preserves area.
uniform float u_angle;     // Degrees clockwise.
uniform float u_softness;  // Fraction of the radius used for the inward feather.
uniform float u_irregularity;
uniform float u_strength;
uniform float u_mode;      // 0: dim, 1: blur, 2: blank patch.
uniform float u_gray;      // Blank patch brightness, 0..1.
uniform float u_blur;      // Blur radius as a percentage of the shorter edge.

void main(void) {
    vec4 base = texture(uTexture, vTextureCoord);
    if (u_size <= 0.0 || u_strength <= 0.0) {
        finalColor = base;
        return;
    }

    // Pixi's pooled filter texture can be bigger than the displayed image.
    // Work in displayed pixels so a circle stays round on any image/viewport.
    vec2 size = uOutputFrame.zw;
    float shortEdge = min(size.x, size.y);
    vec2 p = vTextureCoord * uInputSize.xy - vec2(u_x, u_y) * size;
    float angle = radians(u_angle);
    p = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * p;
    float aspect = sqrt(u_aspect);
    p /= vec2(aspect, 1.0 / aspect);

    float theta = atan(p.y, p.x + 0.00001);
    float edge = 1.0 + u_irregularity * (
        0.12 * sin(3.0 * theta + 0.7) +
        0.07 * sin(5.0 * theta - 0.4) +
        0.03 * cos(9.0 * theta)
    );
    float radius = shortEdge * u_size / 200.0;
    float distance = length(p) / (radius * edge);
    // Keep smoothstep's bounds distinct, even with a nominally hard edge.
    float feather = max(u_softness, 1.0 / max(radius, 1.0));
    float mask = 1.0 - smoothstep(1.0 - feather, 1.0, distance);
    if (mask <= 0.0) {
        finalColor = base;
        return;
    }

    vec4 affected = vec4(0.0, 0.0, 0.0, base.a);
    if (u_mode > 1.5) {
        affected = vec4(vec3(u_gray) * base.a, base.a);
    } else if (u_mode > 0.5) {
        // A small Gaussian kernel removes detail locally; all samples are
        // clamped to valid image pixels, not the unused pooled texture area.
        vec4 blurred = vec4(0.0);
        float total = 0.0;
        vec2 stepUv = shortEdge * u_blur / 200.0 * uInputSize.zw;
        for (int y = -2; y <= 2; y++) {
            for (int x = -2; x <= 2; x++) {
                vec2 offset = vec2(float(x), float(y));
                float weight = exp(-0.5 * dot(offset, offset));
                vec2 uv = clamp(vTextureCoord + offset * stepUv, uInputClamp.xy, uInputClamp.zw);
                blurred += texture(uTexture, uv) * weight;
                total += weight;
            }
        }
        blurred /= total;
        // Keep the source silhouette when a transparent image is loaded.
        affected = vec4(blurred.rgb / max(blurred.a, 0.00001) * base.a, base.a);
    }
    finalColor = mix(base, affected, mask * u_strength);
}
