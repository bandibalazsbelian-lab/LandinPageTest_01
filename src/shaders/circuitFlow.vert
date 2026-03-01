attribute float aProgress;
attribute float aSpeed;

varying float vProgress;
varying vec2 vUv;

uniform float uTime;

void main() {
  vUv = uv;
  vProgress = fract(aProgress + uTime * aSpeed);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
