/**
 * WebGL GLSL prism — full shader-based replacement of the 8 CSS bars.
 *
 * A single screen-quad ShaderMaterial that, in one fragment pass, does:
 *   • 8 procedural "refractive slabs" across the viewport
 *   • Cursor-driven displacement (virtual light source position)
 *   • Chromatic aberration — RGB channels sampled at 3 different offsets
 *     (simulates Snell's law wavelength-dependent refraction)
 *   • Procedural caustics (sin/cos interference with cursor offset)
 *   • Fresnel edge glow per bar, hue-shifted per column
 *   • Lenis scroll-velocity as a bar-tilt amplification uniform
 *   • Web Audio low-band level (via window.KR8AUDIO) as pulse amplitude
 *
 * Source texture: the hero's <video> element, bound as a THREE.VideoTexture.
 * When paused (e.g. after the reveal) it still reads current-frame pixels.
 *
 * Gated behind:
 *   • canvas presence (#prism-webgl)
 *   • WebGL2 availability
 *   • (pointer: fine) for cursor reactivity (still renders on touch)
 *   • prefers-reduced-motion (returns null, leaves CSS bars to carry it)
 *   • IntersectionObserver on .hero — idles GPU when scrolled off
 *
 * Tuned for ~60fps on laptops, adaptive DPR capped at 2.
 */
import * as THREE from 'three';
import { shouldSkipHeavyVisuals } from '@lib/devicePolicy';

interface PrismGL {
  dispose: () => void;
}

interface KR8Audio {
  getLevel?: () => number;
}

interface ScrollCore {
  lenis?: { velocity?: number };
}

const VERT_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Full GLSL fragment shader — 140+ lines of real-time refraction.
// Kept in this file (not a .glsl import) so the Astro/Vite build
// doesn't need extra plugins; the string is inlined by the ShaderMaterial.
const FRAG_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uSource;    // hero video as refraction source
  uniform vec2  uResolution;    // canvas px size
  uniform float uTime;          // seconds since init
  uniform vec2  uMouse;         // normalized 0..1 cursor position (smoothed)
  uniform float uMouseActive;   // 0..1 fade based on pointer presence
  uniform float uScrollVel;     // |lenis.velocity| normalized 0..1
  uniform float uAudio;         // low-band RMS 0..1
  uniform float uDPR;           // effective pixel ratio

  varying vec2 vUv;

  const int BARS = 8;
  const float PI = 3.14159265359;

  // Quick HSV->RGB for per-bar hue tinting.
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  // Cheap 2D hash for procedural caustic noise.
  float hash21(vec2 p) {
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
  }

  // Smooth 2D value noise built from hash21 — used for caustic variation.
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i + vec2(0,0)), hash21(i + vec2(1,0)), u.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 mouse = uMouse;

    // Which of the 8 bars is this pixel in?
    float barF = uv.x * float(BARS);
    int   barI = int(floor(barF));
    float barLocalX = fract(barF);                 // 0..1 within the bar
    float barCenterX = (float(barI) + 0.5) / float(BARS);

    // Per-bar hue — spans the visible spectrum plus KR8TIV pink/purple tail.
    float hue = mod(float(barI) * 0.125 + 0.02, 1.0);

    // Distance from cursor (weight) — decides how much this bar refracts.
    float distToMouse = abs(barCenterX - mouse.x);
    float mouseWeight = smoothstep(0.45, 0.0, distToMouse) * uMouseActive;

    // Vertical tilt phase — each bar gets a sine-driven tilt amplified by
    // cursor proximity + scroll velocity. Looks like glass flexing.
    float tiltPhase = uv.y * 2.0 * PI + uTime * 0.4 + float(barI) * 0.8;
    float tiltAmp = 0.012 + mouseWeight * 0.03 + uScrollVel * 0.04 + uAudio * 0.02;
    float tilt = sin(tiltPhase) * tiltAmp;

    // Virtual "light ray" direction from cursor — x-offset derived from mouse.
    vec2 rayDir = vec2((mouse.x - barCenterX) * 0.6, (mouse.y - uv.y) * 0.2);

    // Snell-lite refraction: each bar deflects the sampled UV by its tilt +
    // a small per-bar cushion based on the ray direction.
    vec2 refractUV = uv + vec2(tilt, 0.0) + rayDir * mouseWeight * 0.04;

    // Chromatic aberration — sample RGB channels at 3 wavelength-scaled
    // offsets. Mouse proximity increases the split (thicker glass illusion).
    float aberration = 0.008 + mouseWeight * 0.012 + uAudio * 0.003;
    vec2 offR = refractUV + vec2( aberration, 0.0);
    vec2 offG = refractUV;
    vec2 offB = refractUV + vec2(-aberration, 0.0);
    float r = texture2D(uSource, clamp(offR, 0.0, 1.0)).r;
    float g = texture2D(uSource, clamp(offG, 0.0, 1.0)).g;
    float b = texture2D(uSource, clamp(offB, 0.0, 1.0)).b;
    vec3 refracted = vec3(r, g, b);

    // Caustic highlight band — a bright vertical line that slides along
    // the bar driven by cursor Y + a slow time oscillation.
    float causticY = mouse.y + sin(uTime * 0.3) * 0.06;
    float causticAnim = exp(-40.0 * pow(uv.y - causticY, 2.0)) * mouseWeight;
    float causticTex  = valueNoise(vec2(uv.x * 18.0 + uTime * 0.6, uv.y * 8.0));
    float caustic = causticAnim * (0.4 + causticTex * 0.6);

    // Fresnel edge glow — rainbow seams at each bar boundary.
    float edge = pow(abs(barLocalX - 0.5) * 2.0, 2.4);
    float fresnel = edge * (0.62 + mouseWeight * 0.55);             // ~25% less baseline

    // Per-bar vertical gradient — fades top/bottom, keeps the CSS-bar feel.
    float vFade = smoothstep(0.0, 0.22, uv.y) * smoothstep(1.0, 0.78, uv.y);

    // Color accumulation. Earlier passes pulled hueTint to 0.60 / alpha
    // to 0.65 — read fine at idle on a busy hero but disappeared
    // through the KR8TIV cutout during the splash reveal where every
    // pixel of color is doing structural work. Bumped back up:
    //   hueTint 0.60 → 0.78  (more spectrum saturation per bar)
    //   fresnel 0.9  → 1.05  (sharper rainbow seams between bars)
    //   exposure 1.55 → 1.7  (slightly hotter tone-map roll-off)
    //   alpha    0.65 → 0.92 (canvas reads as a real refraction layer)
    vec3 hueTint = hsv2rgb(vec3(hue, 0.85, 1.0));
    vec3 color = refracted * 0.38 +
                 hueTint  * (0.78 + mouseWeight * 0.20) * vFade +
                 vec3(1.0, 0.92, 0.78) * caustic * 1.0 +
                 hueTint * fresnel * 1.05;

    // Audio pulse — faint overall luminance bump synced to bass.
    color += vec3(0.08, 0.04, 0.12) * uAudio * (0.5 + mouseWeight);

    // Soft vignette to keep edges from going too hot on wide screens.
    vec2 vc = uv - 0.5;
    float vign = smoothstep(0.92, 0.30, length(vc));
    color *= mix(0.88, 1.02, vign);

    // Final exposure + slight tone-map roll-off to avoid clipping.
    color = 1.0 - exp(-color * 1.70);

    float alpha = (0.92 + mouseWeight * 0.08) * vFade;

    gl_FragColor = vec4(color, alpha);
  }
`;

export function initPrismGL(
  selector = '#prism-webgl',
  /* Optional override for the video that feeds the refraction source
     texture. Pages that don't use the splash `.reveal-sticky > .hero-bg
     video` markup (e.g. /process/, /terms/) pass their own element so
     the shader refracts the right footage instead of falling back to
     a 1×1 grey texture and reading as flat coloured stripes. */
  videoOverride?: HTMLVideoElement | string | null
): PrismGL | null {
  const canvas = document.querySelector<HTMLCanvasElement>(selector);
  if (!canvas) return null;
  if (shouldSkipHeavyVisuals()) return null;

  // WebGL2 preferred but 1 works — Three handles fallback automatically.
  // preserveDrawingBuffer so DevTools / screenshot APIs can sample the
  // output (minor perf cost, fine for a single hero-scale canvas).
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'high-performance',
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
  });
  renderer.setClearColor(0x000000, 0);
  const setSize = (): void => {
    const w = window.innerWidth;
    const h = Math.max(window.innerHeight, 600);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    mat.uniforms.uResolution.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    mat.uniforms.uDPR.value = renderer.getPixelRatio();
  };

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Find the hero video — used as the refraction source texture.
  // Caller-supplied override wins; otherwise try splash → process →
  // terms markup in order so the prism finds whichever hero is on
  // the page without each call site needing custom plumbing.
  let heroVideo: HTMLVideoElement | null = null;
  if (videoOverride instanceof HTMLVideoElement) {
    heroVideo = videoOverride;
  } else if (typeof videoOverride === 'string') {
    heroVideo = document.querySelector<HTMLVideoElement>(videoOverride);
  }
  if (!heroVideo) {
    heroVideo =
      document.querySelector<HTMLVideoElement>('.reveal-sticky > .hero-bg video') ??
      document.querySelector<HTMLVideoElement>('.process-hero-bg .process-hero-video') ??
      document.querySelector<HTMLVideoElement>('.process-hero-bg video');
  }
  let sourceTex: THREE.Texture;
  if (heroVideo) {
    const vt = new THREE.VideoTexture(heroVideo);
    vt.colorSpace = THREE.SRGBColorSpace;
    vt.minFilter = THREE.LinearFilter;
    vt.magFilter = THREE.LinearFilter;
    sourceTex = vt;
    // Kick playback so the VideoTexture has frames to read.
    heroVideo.muted = true;
    heroVideo.play().catch(() => {});
  } else {
    // Fallback: a 1x1 neutral grey texture — shader degrades to tinted bars.
    const d = new Uint8Array([40, 40, 50, 255]);
    sourceTex = new THREE.DataTexture(d, 1, 1, THREE.RGBAFormat);
    sourceTex.needsUpdate = true;
  }

  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSource:      { value: sourceTex },
      uResolution:  { value: new THREE.Vector2(1, 1) },
      uTime:        { value: 0 },
      uMouse:       { value: new THREE.Vector2(0.5, 0.5) },
      uMouseActive: { value: 0 },
      uScrollVel:   { value: 0 },
      uAudio:       { value: 0 },
      uDPR:         { value: 1 }
    },
    vertexShader: VERT_SHADER,
    fragmentShader: FRAG_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  setSize();

  // === Pointer tracking — lerped toward target so motion is smooth. ===
  let targetMX = 0.5, targetMY = 0.5, targetActive = 0;
  const onPointer = (e: PointerEvent): void => {
    targetMX = e.clientX / window.innerWidth;
    targetMY = 1 - (e.clientY / window.innerHeight);
    targetActive = 1;
  };
  const onLeave = (): void => { targetActive = 0; };
  const hero = document.querySelector<HTMLElement>('.hero');
  (hero ?? window).addEventListener('pointermove', onPointer as EventListener);
  (hero ?? window).addEventListener('pointerleave', onLeave);

  // === Frame loop — runs via gsap.ticker when available for sync, else rAF. ===
  let running = true;
  let raf = 0;
  const start = performance.now();
  function frame(): void {
    if (!running) return;
    const now = performance.now();
    mat.uniforms.uTime.value = (now - start) / 1000;

    // Smooth mouse
    const m = mat.uniforms.uMouse.value as THREE.Vector2;
    m.x += (targetMX - m.x) * 0.12;
    m.y += (targetMY - m.y) * 0.12;
    mat.uniforms.uMouseActive.value += (targetActive - mat.uniforms.uMouseActive.value) * 0.08;

    // Lenis velocity (from scrollCore) — pixels per frame-ish. Clamp to 0..1.
    const core = (window as unknown as { __KR8?: ScrollCore }).__KR8;
    const vel = core?.lenis?.velocity ? Math.abs(core.lenis.velocity) : 0;
    const velNorm = Math.min(vel / 80, 1);
    const cur = mat.uniforms.uScrollVel.value as number;
    mat.uniforms.uScrollVel.value = cur * 0.82 + velNorm * 0.18;

    // Web Audio level
    const audio = (window as unknown as { KR8AUDIO?: KR8Audio }).KR8AUDIO;
    const level = audio?.getLevel?.() ?? 0;
    const cA = mat.uniforms.uAudio.value as number;
    mat.uniforms.uAudio.value = cA * 0.78 + level * 0.22;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // === Viewport gate — idle GPU when hero leaves viewport. ===
  const heroEl = document.querySelector('.hero');
  let io: IntersectionObserver | null = null;
  if (heroEl && 'IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!running) { running = true; raf = requestAnimationFrame(frame); }
        } else {
          running = false;
          cancelAnimationFrame(raf);
        }
      }
    }, { threshold: 0.02 });
    io.observe(heroEl);
  }

  const onResize = (): void => setSize();
  window.addEventListener('resize', onResize);

  // Hide the CSS prism bars when GL is active — same visual job, don't
  // double-paint. The CSS fallback re-appears if this module bails on
  // reduced-motion / no-webgl.
  document.documentElement.classList.add('prism-gl-active');

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      (hero ?? window).removeEventListener('pointermove', onPointer as EventListener);
      (hero ?? window).removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
      io?.disconnect();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      sourceTex.dispose();
      document.documentElement.classList.remove('prism-gl-active');
    }
  };
}
