varying vec2 vUv;
varying vec3 vPos;

uniform float uTime;
uniform float uHover;
uniform vec2 uMouse;

void main() {
  vUv = uv;
  vPos = position;

  // Organic breathing (dual sine)
  float breath = 1.0 + sin(uTime * 0.7) * 0.012 + sin(uTime * 1.1) * 0.006;
  vec3 pos = position * breath;

  // Parallax from mouse — edges displace more
  float distFromCenter = length(position.xy);
  float parallaxStrength = distFromCenter * 0.06;
  pos.x += uMouse.x * parallaxStrength;
  pos.y += uMouse.y * parallaxStrength;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
