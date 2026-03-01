uniform float uTime;
uniform float uHover;
uniform vec2 uMouse;
uniform vec3 uColor1;      // #00ff88
uniform vec3 uColor2;      // #33cc55
uniform vec3 uCircuitColor; // #00e5ff

varying vec2 vUv;
varying vec3 vPos;

// Hash function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}

// 4-leaf clover SDF — wider, more organic leaves
float sdCloverLeaf(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);

  // Push outward from center
  p.y -= 0.28;
  float r = length(p);
  float a = atan(p.y, p.x);

  // Wider leaf with pointed tip
  float shape = r - 0.32 * pow(0.5 + 0.5 * sin(a), 0.75);
  return shape;
}

// Organic vein pattern inside leaves
float veinPattern(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  vec2 rp = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  rp.y -= 0.28;

  // Central vein
  float centralVein = abs(rp.x) * 4.0;
  centralVein = exp(-centralVein * centralVein * 8.0);

  // Side veins branching from center
  float sideAngle = atan(rp.y, rp.x);
  float sideVein = abs(sin(sideAngle * 3.0 + rp.y * 4.0));
  sideVein = exp(-sideVein * sideVein * 6.0) * 0.5;

  return centralVein + sideVein;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;

  // Four leaves at 45, 135, 225, 315 degrees (rotated 45° for classic clover look)
  float d1 = sdCloverLeaf(uv, 0.7854);
  float d2 = sdCloverLeaf(uv, 2.3562);
  float d3 = sdCloverLeaf(uv, 3.9270);
  float d4 = sdCloverLeaf(uv, 5.4978);

  float d = min(min(d1, d2), min(d3, d4));

  // Determine which leaf we're in (for per-leaf effects)
  float leafIndex = 0.0;
  if (d == d2) leafIndex = 1.0;
  else if (d == d3) leafIndex = 2.0;
  else if (d == d4) leafIndex = 3.0;

  // Petal fill with radial gradient
  float petalMask = 1.0 - smoothstep(-0.015, 0.015, d);
  float distFromCenter = length(uv);
  vec3 petalColor = mix(uColor1, uColor2, distFromCenter * 0.7);

  // Depth shading — darker toward edges
  float depthShade = 1.0 - smoothstep(0.0, 0.35, distFromCenter) * 0.3;
  petalColor *= depthShade;

  // Vein pattern (organic circuit lines inside leaves)
  float veins = 0.0;
  veins += veinPattern(uv, 0.7854);
  veins += veinPattern(uv, 2.3562);
  veins += veinPattern(uv, 3.9270);
  veins += veinPattern(uv, 5.4978);
  veins = min(veins, 1.0) * petalMask;

  // Circuit grid overlay (subtle)
  vec2 gridUv = vUv * 10.0;
  float gridX = smoothstep(0.46, 0.5, abs(fract(gridUv.x) - 0.5));
  float gridY = smoothstep(0.46, 0.5, abs(fract(gridUv.y) - 0.5));
  float circuit = max(gridX, gridY) * petalMask * 0.4;

  // Energy flow along veins and circuits
  float flow1 = fract(distFromCenter * 3.0 - uTime * 0.4);
  flow1 = smoothstep(0.0, 0.12, flow1) * (1.0 - smoothstep(0.12, 0.24, flow1));

  float flow2 = fract(gridUv.x + gridUv.y + uTime * 0.6);
  flow2 = smoothstep(0.0, 0.1, flow2) * (1.0 - smoothstep(0.1, 0.2, flow2));

  // Circuit nodes
  vec2 nodeUv = fract(gridUv) - 0.5;
  float nodeDist = length(nodeUv);
  float node = 1.0 - smoothstep(0.04, 0.1, nodeDist);
  float nodePulse = sin(uTime * 2.5 + hash(floor(gridUv)) * 6.28) * 0.5 + 0.5;

  // Per-leaf hover glow (leaf closest to mouse brightens more)
  float leafAngle = atan(uv.y, uv.x);
  float mouseAngle = atan(uMouse.y, uMouse.x);
  float angleDiff = abs(mod(leafAngle - mouseAngle + 3.14159, 6.28318) - 3.14159);
  float mouseProximity = 1.0 - smoothstep(0.0, 1.5, angleDiff);

  // Combine colors
  vec3 color = petalColor * petalMask;
  color += uCircuitColor * veins * 0.35;
  color += uCircuitColor * circuit * 0.2;
  color += uCircuitColor * flow1 * veins * (0.6 + uHover * 1.5);
  color += uCircuitColor * flow2 * circuit * (0.3 + uHover * 0.8);
  color += uCircuitColor * node * nodePulse * petalMask * 0.7;

  // Hover glow
  color += petalColor * uHover * 0.25 * petalMask;
  color += uCircuitColor * uHover * mouseProximity * 0.3 * petalMask;

  // Edge glow (neon outline)
  float edgeGlow = smoothstep(0.02, -0.01, d) * (1.0 - smoothstep(-0.01, -0.04, d));
  color += uColor1 * edgeGlow * (0.6 + uHover * 0.8);

  // Alpha
  float alpha = petalMask * 0.92 + circuit * 0.15 + node * nodePulse * 0.2 + edgeGlow * 0.5;
  alpha = clamp(alpha, 0.0, 1.0);

  // Center stem dot
  float center = 1.0 - smoothstep(0.06, 0.12, length(uv));
  alpha *= (1.0 - center * 0.6);
  color += uCircuitColor * center * 0.5;

  gl_FragColor = vec4(color, alpha);
}
