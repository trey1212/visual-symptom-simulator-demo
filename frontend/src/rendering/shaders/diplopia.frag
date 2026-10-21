// Diplopia (double vision): blends a shifted "ghost" copy over the image.

// Must match the vertex shader, which declares uInputSize etc. as highp.
precision highp float;

in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;   // xy: input texture size in px, zw: 1 / size
uniform vec4 uInputClamp;  // texture-coord bounds that contain image pixels
uniform vec4 uOutputFrame; // zw: size of the filtered area in px

uniform float u_offset;  // ghost distance, as a fraction of image width
uniform float u_angle;   // ghost direction in degrees (0 = right, 90 = down)
uniform float u_opacity; // ghost strength, 0..1

void main(void) {
    float a = radians(u_angle);
    vec2 offsetPx = vec2(cos(a), sin(a)) * u_offset * uOutputFrame.z;
    vec2 ghostUv = clamp(vTextureCoord - offsetPx * uInputSize.zw, uInputClamp.xy, uInputClamp.zw);

    vec4 base = texture(uTexture, vTextureCoord);
    vec4 ghost = texture(uTexture, ghostUv);
    finalColor = mix(base, ghost, u_opacity);
}
