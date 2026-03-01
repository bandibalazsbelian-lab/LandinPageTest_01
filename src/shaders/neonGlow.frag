uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
uniform float uPulse;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  // Fresnel-based edge glow
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
  fresnel = pow(fresnel, 2.0);

  // Pulse effect
  float pulse = 1.0 + sin(uTime * 2.0) * uPulse * 0.15;

  // Core glow
  float glow = fresnel * uIntensity * pulse;

  vec3 color = uColor * (0.5 + glow);
  float alpha = 0.3 + glow * 0.7;

  gl_FragColor = vec4(color, alpha);
}
