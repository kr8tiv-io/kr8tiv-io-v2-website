/**
 * boxStar — WebGL-accelerated pink-star trailer that orbits a box's
 * rounded-rectangle perimeter. Single fragment shader, no FBO ping-
 * pong: each fragment iteratively samples N past head positions and
 * accumulates a Gaussian glow per sample, fading by index. The result
 * is a smooth, analytical trail that's perfectly continuous around
 * corners (no per-frame discretization artefacts) and runs in a single
 * GL pass.
 *
 * Tuned for "buttery pink, slow, subtle, beautiful":
 *   · color   ≈ #ff8cdb (warm pink, slightly red-shifted from neon)
 *   · speed   ≈ 0.045 cycles/sec  → ~22 sec per lap
 *   · trail   ≈ 64 samples × 0.12 s spacing → ~7.7 s of tail
 *   · σ       ≈ 6 px              → tight bright core
 *   · halo σ  ≈ 27 px              → soft outer bloom
 *
 * Gating:
 *   · prefers-reduced-motion / html.motion-off → returns null
 *   · IntersectionObserver pauses the rAF when the box scrolls off
 *   · ResizeObserver re-syncs uResolution + corner radius
 */

import * as THREE from 'three';

export interface BoxStarHandle {
  dispose(): void;
}

export interface BoxStarOptions {
  /** RGB 0..1, defaults to a buttery pink (#ff8cdb-ish). */
  color?: [number, number, number];
  /** Cycles around the perimeter per second (default 0.045 ≈ 22 s/lap). */
  speed?: number;
  /** Gaussian σ for the bright star core, in CSS px (default 6). */
  starSize?: number;
  /** Seconds between trail samples (default 0.12). */
  trailSpacing?: number;
  /** Path corner-rounding in CSS px (default matches box border-radius 6). */
  cornerRadius?: number;
  /** Multiplier for trail brightness (default 1.0). Lower for subtler. */
  intensity?: number;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Fragment shader: trail = Σᵢ Gaussian(distᵢ) × fadeᵢ for i in [0, N).
 * pathPos walks a rounded-rectangle perimeter parameterised on t∈[0,1].
 * uTime + uSpeed give the head's t; trailSpacing offsets each sample
 * back in time. fract() wraps so the lap is seamless.
 */
const FRAG = /* glsl */ `
  precision highp float;

  uniform vec2  uResolution;     // device-px
  uniform float uTime;           // seconds since init
  uniform float uSpeed;          // cycles/sec
  uniform float uTrailSpacing;   // seconds between samples
  uniform float uStarSize;       // device-px σ for core glow
  uniform float uCornerR;        // device-px corner radius
  uniform float uIntensity;
  uniform vec3  uColor;

  varying vec2 vUv;

  vec2 pathPos(float t) {
    float w = uResolution.x;
    float h = uResolution.y;
    float r = min(uCornerR, min(w, h) * 0.5);
    float sw = max(w - 2.0 * r, 0.0);
    float sh = max(h - 2.0 * r, 0.0);
    float arc = 1.5707963 * r;
    float total = 2.0 * sw + 2.0 * sh + 4.0 * arc;
    float d = t * total;

    if (d < sw) return vec2(r + d, 0.0);
    d -= sw;
    if (d < arc) {
      float a = (d / arc) * 1.5707963;
      return vec2(w - r + sin(a) * r, r - cos(a) * r);
    }
    d -= arc;
    if (d < sh) return vec2(w, r + d);
    d -= sh;
    if (d < arc) {
      float a = (d / arc) * 1.5707963;
      return vec2(w - r + cos(a) * r, h - r + sin(a) * r);
    }
    d -= arc;
    if (d < sw) return vec2(w - r - d, h);
    d -= sw;
    if (d < arc) {
      float a = (d / arc) * 1.5707963;
      return vec2(r - sin(a) * r, h - r + cos(a) * r);
    }
    d -= arc;
    if (d < sh) return vec2(0.0, h - r - d);
    d -= sh;
    float a = (d / arc) * 1.5707963;
    return vec2(r - cos(a) * r, r - sin(a) * r);
  }

  void main() {
    vec2 px = vUv * uResolution;

    vec3 col = vec3(0.0);
    float alpha = 0.0;
    const int TRAIL_LENGTH = 64;
    float haloSigma = uStarSize * 4.5;

    for (int i = 0; i < TRAIL_LENGTH; i++) {
      float ti = uTime - float(i) * uTrailSpacing;
      float t  = fract(ti * uSpeed);
      vec2 sp  = pathPos(t);
      float d  = length(px - sp);

      float fade = 1.0 - float(i) / float(TRAIL_LENGTH);
      fade = fade * fade;

      float core = exp(-d * d / (2.0 * uStarSize * uStarSize));
      float halo = exp(-d * d / (2.0 * haloSigma * haloSigma)) * 0.28;

      col   += uColor * (core + halo) * fade * uIntensity;
      alpha += (core + halo * 0.6) * fade * uIntensity;
    }

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

export function initBoxStar(
  target: HTMLElement,
  opts: BoxStarOptions = {}
): BoxStarHandle | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  if (document.documentElement.classList.contains('motion-off')) return null;

  const cfg = {
    color: opts.color ?? ([1.0, 0.55, 0.86] as [number, number, number]),
    speed: opts.speed ?? 0.045,
    starSize: opts.starSize ?? 6,
    trailSpacing: opts.trailSpacing ?? 0.12,
    cornerRadius: opts.cornerRadius ?? 6,
    intensity: opts.intensity ?? 1.0,
  };

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;' +
    'mix-blend-mode:screen;border-radius:inherit;z-index:1;';
  canvas.setAttribute('aria-hidden', 'true');
  if (getComputedStyle(target).position === 'static') {
    target.style.position = 'relative';
  }
  target.appendChild(canvas);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    });
  } catch {
    canvas.remove();
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uSpeed: { value: cfg.speed },
      uTrailSpacing: { value: cfg.trailSpacing },
      uStarSize: { value: cfg.starSize },
      uCornerR: { value: cfg.cornerRadius },
      uIntensity: { value: cfg.intensity },
      uColor: { value: new THREE.Vector3(...cfg.color) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const geo = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  const setSize = (): void => {
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(r.width, r.height, false);
    mat.uniforms.uResolution.value.set(r.width * dpr, r.height * dpr);
    mat.uniforms.uStarSize.value = cfg.starSize * dpr;
    mat.uniforms.uCornerR.value = cfg.cornerRadius * dpr;
  };
  setSize();

  let raf = 0;
  let running = true;
  const start = performance.now();
  const frame = (): void => {
    if (!running) return;
    mat.uniforms.uTime.value = (performance.now() - start) / 1000;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  const ro = new ResizeObserver(setSize);
  ro.observe(target);

  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (!running) {
              running = true;
              raf = requestAnimationFrame(frame);
            }
          } else {
            running = false;
            cancelAnimationFrame(raf);
          }
        }
      },
      { threshold: 0 }
    );
    io.observe(target);
  }

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
