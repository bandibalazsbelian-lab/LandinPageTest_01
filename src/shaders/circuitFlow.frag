uniform vec3 uColor;
uniform float uTime;

varying float vProgress;
varying vec2 vUv;

void main() {
  // Energy flow along circuit paths
  float energy = smoothstep(0.0, 0.1, vProgress) * (1.0 - smoothstep(0.1, 0.3, vProgress));
  energy = max(energy, 0.15); // Base line visibility

  // Pulse nodes at intersections
  float pulse = sin(uTime * 3.0) * 0.5 + 0.5;

  vec3 color = uColor * (energy + pulse * 0.1);
  float alpha = energy * 0.8 + 0.2;

  gl_FragColor = vec4(color, alpha);
}
