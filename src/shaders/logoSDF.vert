varying vec2 vUv;
varying vec3 vPos;

uniform float uTime;
uniform float uHover;

void main() {
  vUv = uv;
  vPos = position;

  // Subtle breathing scale
  float breath = 1.0 + sin(uTime * 0.7) * 0.01;
  vec3 pos = position * breath;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
