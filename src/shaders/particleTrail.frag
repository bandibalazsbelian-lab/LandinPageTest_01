varying float vAlpha;
varying vec3 vColor;

void main() {
  // Soft circle with glow falloff
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;

  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  alpha *= vAlpha;

  // Soft glow
  float glow = exp(-dist * 4.0) * 0.5;

  vec3 color = vColor + vColor * glow;
  gl_FragColor = vec4(color, alpha);
}
