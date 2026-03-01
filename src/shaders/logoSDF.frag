uniform float uTime;
uniform float uHover;
uniform vec3 uColor1;  // #00ff88
uniform vec3 uColor2;  // #33cc55
uniform vec3 uCircuitColor; // #00e5ff

varying vec2 vUv;
varying vec3 vPos;

// Petal SDF - heart/leaf shape
float sdPetal(vec2 p, float angle) {
  // Rotate point
  float c = cos(angle);
  float s = sin(angle);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);

  // Leaf/petal shape using distance fields
  p.y -= 0.25;
  float r = length(p);
  float a = atan(p.y, p.x);

  // Cardioid-like shape
  float shape = r - 0.3 * (1.0 + sin(a)) * 0.5;
  return shape;
}

// Simple hash
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;

  // Four petals at 0, 90, 180, 270 degrees
  float d1 = sdPetal(uv, 0.0);
  float d2 = sdPetal(uv, 1.5708);
  float d3 = sdPetal(uv, 3.1416);
  float d4 = sdPetal(uv, 4.7124);

  float d = min(min(d1, d2), min(d3, d4));

  // Petal fill with gradient
  float petalMask = 1.0 - smoothstep(-0.02, 0.02, d);
  vec3 petalColor = mix(uColor1, uColor2, length(uv) * 0.8);

  // Circuit lines (grid pattern over petals)
  vec2 gridUv = vUv * 8.0;
  float gridX = smoothstep(0.45, 0.5, abs(fract(gridUv.x) - 0.5));
  float gridY = smoothstep(0.45, 0.5, abs(fract(gridUv.y) - 0.5));
  float circuit = max(gridX, gridY) * petalMask;

  // Energy flow along circuits
  float flow = fract(gridUv.x + gridUv.y + uTime * 0.5);
  flow = smoothstep(0.0, 0.15, flow) * (1.0 - smoothstep(0.15, 0.3, flow));

  // Circuit nodes at intersections
  vec2 nodeUv = fract(gridUv) - 0.5;
  float nodeDist = length(nodeUv);
  float node = 1.0 - smoothstep(0.05, 0.12, nodeDist);
  float nodePulse = sin(uTime * 3.0 + hash(floor(gridUv)) * 6.28) * 0.5 + 0.5;

  // Combine
  vec3 color = petalColor * petalMask;
  color += uCircuitColor * circuit * 0.3;
  color += uCircuitColor * flow * circuit * (0.5 + uHover * 1.0);
  color += uCircuitColor * node * nodePulse * petalMask * 0.8;

  // Hover glow
  color += petalColor * uHover * 0.3 * petalMask;

  // Alpha
  float alpha = petalMask * 0.9 + circuit * 0.2 + node * nodePulse * 0.3;
  alpha = clamp(alpha, 0.0, 1.0);

  // Center hole (where petals meet)
  float center = 1.0 - smoothstep(0.08, 0.15, length(uv));
  alpha *= (1.0 - center * 0.8);

  gl_FragColor = vec4(color, alpha);
}
