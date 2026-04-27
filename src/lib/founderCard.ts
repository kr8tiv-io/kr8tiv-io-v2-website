/**
 * Founder-card WebGL glass-morph hover effect.
 *
 * Places a small Three.js canvas inside `.founder` that renders a
 * procedural glass surface: Fresnel edge lighting + caustic ripples
 * + subtle chromatic aberration. Idles as a gentle drift; on hover
 * intensity ramps up, caustics accelerate, and Fresnel edge lights
 * up with the brand accent magenta.
 *
 * Lazy-loaded — Three.js is a big import, so this only fires when
 * `.founder` is in viewport (IntersectionObserver gate).
 *
 * Respects reduced-motion: shader runs at 0 intensity, static
 * displacement, still pretty but not animated.
 */
import * as THREE from 'three';
import { isPhoneClassTouch } from '@lib/devicePolicy';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uHover;        // 0..1 intensity from hover
  uniform vec2  uMouse;        // 0..1 local mouse position
  uniform vec3  uAccent;       // #ff6ad5 magenta
  uniform vec3  uAccent2;      // #8e00ff purple
  uniform vec2  uResolution;

  // ==== Utility ====
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    float a = hash(i); float b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)); float d = hash(i + vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 mv = uMouse - uv;
    float d = length(mv);

    // Fresnel edge — bright at edges, transparent in center
    float edge = smoothstep(0.0, 0.52, length(uv - 0.5));
    edge = pow(edge, 2.2);

    // Caustic ripples — animated FBM distorted by mouse
    vec2 p = uv * 4.0 + vec2(uTime * 0.08, uTime * 0.05);
    p += mv * (1.2 + uHover * 2.5);
    float caustic = fbm(p);
    caustic = pow(caustic, 1.8);
    caustic *= (0.3 + uHover * 0.7);

    // Chromatic aberration: offset the three color samples around mouse
    float ca = 0.003 + uHover * 0.012;
    float r = fbm(p + vec2(ca, 0.0));
    float g = fbm(p);
    float b = fbm(p - vec2(ca, 0.0));

    vec3 col = vec3(r, g, b);
    col = mix(col, uAccent,  caustic * 0.55);
    col = mix(col, uAccent2, caustic * 0.25 * uHover);

    // Soft vignette + edge glow
    col += edge * uAccent * (0.35 + uHover * 0.8);

    // Slight luminance lift near mouse
    col += (1.0 - smoothstep(0.0, 0.32, d)) * uAccent * 0.25 * uHover;

    // Output with alpha that fades toward edge so the card blends.
    // Bumped idle multiplier 0.55→0.78 so the glass surface is
    // visibly alive at rest, not just on hover.
    float alpha = 0.45 + edge * 0.35 + caustic * 0.4;
    alpha = clamp(alpha * (0.78 + uHover * 0.45), 0.0, 0.95);

    gl_FragColor = vec4(col, alpha);
  }
`;

export function initFounderCard(): void {
  if (typeof window === 'undefined') return;
  if (isPhoneClassTouch()) return;
  const host = document.querySelector<HTMLElement>('.founder');
  if (!host) return;

  // IntersectionObserver gate — don't boot WebGL until the card nears viewport
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        boot(host);
        io.disconnect();
      }
    });
  }, { rootMargin: '200px 0px' });
  io.observe(host);
}

function boot(host: HTMLElement): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Create a positioned wrapper that sits behind the letter content.
  const wrap = document.createElement('div');
  wrap.className = 'founder-gl';
  wrap.setAttribute('aria-hidden', 'true');
  Object.assign(wrap.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '0',
    overflow: 'hidden',
    borderRadius: '8px'
  } as CSSStyleDeclaration);
  host.style.position = 'relative';
  host.insertBefore(wrap, host.firstChild);
  // Make sure children sit above the GL layer
  host.querySelectorAll<HTMLElement>(':scope > :not(.founder-gl)').forEach((el) => {
    if (!el.style.position) el.style.position = 'relative';
    el.style.zIndex = '1';
  });

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  wrap.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: 'low-power'
  });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -1, 1);

  const uniforms = {
    uTime: { value: 0 },
    uHover: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uAccent: { value: new THREE.Color(0xff6ad5) },
    uAccent2: { value: new THREE.Color(0x8e00ff) },
    uResolution: { value: new THREE.Vector2(1, 1) }
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  scene.add(mesh);

  const resize = (): void => {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    uniforms.uResolution.value.set(r.width, r.height);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // Hover tracking with lerp'd uniforms
  let hoverTarget = 0;
  let mouseTargetX = 0.5, mouseTargetY = 0.5;
  host.addEventListener('pointerenter', () => { hoverTarget = 1; });
  host.addEventListener('pointerleave', () => { hoverTarget = 0; });
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    mouseTargetX = (e.clientX - r.left) / r.width;
    mouseTargetY = 1 - (e.clientY - r.top) / r.height;
  });

  let rafId = 0;
  const start = performance.now();
  function render(): void {
    const t = (performance.now() - start) * 0.001;
    uniforms.uTime.value = reduced ? 0 : t;
    uniforms.uHover.value += (hoverTarget - uniforms.uHover.value) * 0.08;
    uniforms.uMouse.value.x += (mouseTargetX - uniforms.uMouse.value.x) * 0.12;
    uniforms.uMouse.value.y += (mouseTargetY - uniforms.uMouse.value.y) * 0.12;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(render);
  }
  render();

  // Tab visibility: pause rAF when hidden to save GPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else render();
  });
}
