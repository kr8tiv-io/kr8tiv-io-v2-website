/**
 * reelScene — two layered SOTA effects for the Reel section, fed off
 * the same forest video texture so the visuals cohere instead of
 * competing.
 *
 * 1. Volumetric Prism Slab — a floating glass plane between the
 *    viewer and the video that performs screen-space refraction with
 *    real chromatic dispersion (RGB sampled at three angles offset
 *    along the slab normal). Tilts toward the cursor; Fresnel rim
 *    glows brighter when the pointer's near.
 *
 * 2. Refractive Mirror Lake — a horizontal plane at the bottom that
 *    samples a flipped chromatic-shifted version of the video,
 *    distorted by a curl-noise + cursor-driven ripple field. Reads as
 *    a black-mercury watershed reflecting the title above.
 *
 * Single Three.js scene, two materials, one shared video texture, one
 * orthographic camera. Cursor is tracked at the section level and
 * shared across both shaders, so the prism slab and the lake ripples
 * respond to the same gesture in lockstep.
 *
 * Gates:
 *   · prefers-reduced-motion / html.motion-off → returns null
 *   · IntersectionObserver pauses the rAF when off-screen
 *   · ResizeObserver re-syncs uResolution
 */

import * as THREE from 'three';

export interface ReelSceneHandle {
  dispose(): void;
}

export interface ReelSceneOptions {
  /** Slab tint RGB 0..1 (default warm pink, sympathetic to the title accent). */
  slabTint?: [number, number, number];
  /** Lake tint RGB 0..1 (default purple-pink for jewel-tone mercury). */
  lakeTint?: [number, number, number];
  /** Slab chromatic dispersion strength (default 0.018). */
  slabDispersion?: number;
  /** Lake ripple amplitude (default 0.045). */
  lakeRipple?: number;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* Prism slab — screen-space refraction over a video texture. The slab
   occupies a centred rectangle (computed in shader from uSlabRect).
   Outside the slab footprint the shader writes alpha 0 so the page
   reads through unchanged. Inside, RGB is sampled at three slightly
   different UVs offset along the slab normal — true dispersion. A
   Fresnel rim brightens with cursor proximity. */
const FRAG_SLAB = /* glsl */ `
  precision highp float;

  uniform sampler2D uVideo;
  uniform vec2  uResolution;       // device-px
  uniform vec2  uMouse;            // 0..1 (pointer in slab local UV space)
  uniform float uMouseActive;
  uniform float uTime;
  uniform float uDispersion;
  uniform vec3  uTint;
  uniform vec4  uSlabRect;         // xy = top-left fraction (0..1), zw = size

  varying vec2 vUv;

  /* Inverse-y so the slab UV runs top-down like CSS. */
  vec2 toSlabUV(vec2 frag) {
    return (frag - uSlabRect.xy) / uSlabRect.zw;
  }

  void main() {
    /* Use screen-space y (top-down) for the slab math. */
    vec2 frag = vec2(vUv.x, 1.0 - vUv.y);
    vec2 slabUV = toSlabUV(frag);

    if (slabUV.x < 0.0 || slabUV.x > 1.0 || slabUV.y < 0.0 || slabUV.y > 1.0) {
      discard;
    }

    /* Tilt vector — the slab "leans" toward the cursor. The tilt is
       applied as a refractive ray-bend that displaces the sampled UV. */
    vec2 mouseLocal = (uMouse - vec2(0.5));
    vec2 tiltAmount = mouseLocal * 0.085 * uMouseActive;

    /* Slow ambient drift so the slab breathes when the cursor's idle. */
    float drift = sin(uTime * 0.4 + slabUV.y * 4.0) * 0.0035;

    /* Slab-local refraction sample: full-frame video uv = vUv (with
       inverted y for video texture orientation). Snell-lite: each
       channel offset by uDispersion along the perpendicular of the
       tilt direction so red/blue split in the same direction the
       slab is leaning. */
    vec2 baseUV = vec2(vUv.x + tiltAmount.x + drift, vUv.y + tiltAmount.y);

    vec2 perp = normalize(tiltAmount + vec2(1e-5));
    float dispersion = uDispersion + uMouseActive * 0.012;

    float r = texture2D(uVideo, baseUV + perp * dispersion).r;
    float g = texture2D(uVideo, baseUV).g;
    float b = texture2D(uVideo, baseUV - perp * dispersion).b;
    vec3 refracted = vec3(r, g, b);

    /* Fresnel-style rim — brightens at the slab edges, more so toward
       the cursor. (slab-local distance-from-edge → smoothstep) */
    float edgeX = min(slabUV.x, 1.0 - slabUV.x);
    float edgeY = min(slabUV.y, 1.0 - slabUV.y);
    float edge = min(edgeX, edgeY);
    float rim = smoothstep(0.04, 0.0, edge);
    float distToMouse = length(slabUV - uMouse);
    float rimBoost = smoothstep(0.4, 0.0, distToMouse) * uMouseActive;

    /* Subtle dichroic tint — the prism vibe — modulated by rim. */
    vec3 dichroic = mix(uTint, vec3(0.45, 0.85, 1.0), 0.5 + sin(uTime * 0.6 + slabUV.x * 3.0) * 0.5);

    vec3 col = refracted * 0.92
             + dichroic * rim * (0.32 + rimBoost * 0.55)
             + uTint    * rim * 0.18;

    /* Soft inner shadow at the slab perimeter — gives it weight. */
    float innerShade = smoothstep(0.0, 0.012, edge);
    col *= mix(0.78, 1.0, innerShade);

    float alpha = 0.62 + rim * 0.30 + rimBoost * 0.18;

    gl_FragColor = vec4(col, alpha);
  }
`;

/* Mirror lake — horizontal plane occupying the bottom band of the
   section. Samples the video flipped vertically (reflection), with a
   curl-noise + cursor-driven ripple field perturbing the UVs. */
const FRAG_LAKE = /* glsl */ `
  precision highp float;

  uniform sampler2D uVideo;
  uniform vec2  uResolution;
  uniform vec2  uMouse;            // 0..1 in lake-local UV
  uniform float uMouseActive;
  uniform float uTime;
  uniform float uRippleAmp;
  uniform vec3  uTint;

  varying vec2 vUv;

  /* Quick 2D hash for noise. */
  float hash21(vec2 p) {
    p = fract(p * vec2(233.34, 851.73));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i + vec2(0,0)), hash21(i + vec2(1,0)), u.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
  }

  void main() {
    /* Lake-local uv: x = 0..1 left→right, y = 0..1 bottom→top. */
    vec2 lakeUV = vUv;

    /* Restrict the lake to the bottom 38% of the section. */
    float lakeTop = 0.38;
    if (lakeUV.y > lakeTop) discard;

    /* Strength fade — full at bottom, zero at lake top. */
    float strength = smoothstep(lakeTop, 0.05, lakeUV.y);

    /* Two layers of curl noise as the ambient ripple field. */
    float n1 = vnoise(vec2(lakeUV.x * 5.5, lakeUV.y * 8.0 + uTime * 0.25));
    float n2 = vnoise(vec2(lakeUV.x * 11.0 - uTime * 0.35, lakeUV.y * 14.0));
    vec2 noiseUV = vec2(n1, n2) - 0.5;

    /* Cursor ripple — concentric falloff from the cursor projected
       onto the lake plane. */
    float distToMouse = length(lakeUV - uMouse);
    float ripple = sin(distToMouse * 38.0 - uTime * 4.5) *
                   exp(-distToMouse * 5.0) * uMouseActive;

    vec2 distortion = (noiseUV * 0.022 + vec2(ripple) * 0.018) *
                      uRippleAmp * (0.6 + strength);

    /* Sample the video flipped vertically + distorted. The flip
       turns the source into a "reflection" of what's overhead. */
    vec2 sampleUV = vec2(lakeUV.x, lakeTop * 2.5 - lakeUV.y) + distortion;

    /* Three-channel chromatic split tied to the noise gradient. */
    vec2 chromaDir = normalize(noiseUV + vec2(1e-4));
    float dispersion = 0.005 + ripple * 0.004;
    float r = texture2D(uVideo, sampleUV + chromaDir * dispersion).r;
    float g = texture2D(uVideo, sampleUV).g;
    float b = texture2D(uVideo, sampleUV - chromaDir * dispersion).b;
    vec3 col = vec3(r, g, b) * uTint;

    /* Darken the lake slightly and add specular highlights where the
       ripple peaks are tallest. */
    float spec = smoothstep(0.55, 1.0, ripple + 0.5) * uMouseActive;
    col += vec3(0.85, 0.65, 0.95) * spec * 0.45;

    /* Reflective-mercury feel: lift contrast, deepen blacks. */
    col = pow(col, vec3(1.18)) * 0.92;

    float alpha = strength * (0.62 + ripple * 0.18);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function initReelScene(
  target: HTMLElement,
  videoEl: HTMLVideoElement,
  opts: ReelSceneOptions = {}
): ReelSceneHandle | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  if (document.documentElement.classList.contains('motion-off')) return null;

  const cfg = {
    slabTint: opts.slabTint ?? ([1.0, 0.55, 0.86] as [number, number, number]),
    lakeTint: opts.lakeTint ?? ([0.92, 0.62, 0.95] as [number, number, number]),
    slabDispersion: opts.slabDispersion ?? 0.018,
    lakeRipple: opts.lakeRipple ?? 0.045,
  };

  /* Two stacked canvases — one for the slab, one for the lake — so
     each gets its own ShaderMaterial and the discard regions don't
     fight. Both share the same VideoTexture instance. */
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:absolute;inset:0;pointer-events:none;z-index:2;';
  wrap.setAttribute('aria-hidden', 'true');
  if (getComputedStyle(target).position === 'static') {
    target.style.position = 'relative';
  }
  target.appendChild(wrap);

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:screen;';
  wrap.appendChild(canvas);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    wrap.remove();
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const videoTex = new THREE.VideoTexture(videoEl);
  videoTex.colorSpace = THREE.SRGBColorSpace;
  videoTex.minFilter = THREE.LinearFilter;
  videoTex.magFilter = THREE.LinearFilter;
  videoTex.wrapS = THREE.ClampToEdgeWrapping;
  videoTex.wrapT = THREE.ClampToEdgeWrapping;

  /* Slab geometry: a rectangle centred horizontally, mid-vertical,
     sized ~46% × 40% of the section. uSlabRect is in fragment coords
     (0..1 left-to-right, 0..1 top-to-bottom in CSS sense). */
  const SLAB_W = 0.46;
  const SLAB_H = 0.40;
  const slabRect = new THREE.Vector4(
    (1 - SLAB_W) / 2, // x
    0.18,             // y (from top, ~upper-middle so it doesn't crowd the title)
    SLAB_W,
    SLAB_H
  );

  const slabMat = new THREE.ShaderMaterial({
    uniforms: {
      uVideo: { value: videoTex },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseActive: { value: 0 },
      uTime: { value: 0 },
      uDispersion: { value: cfg.slabDispersion },
      uTint: { value: new THREE.Vector3(...cfg.slabTint) },
      uSlabRect: { value: slabRect },
    },
    vertexShader: VERT,
    fragmentShader: FRAG_SLAB,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const lakeMat = new THREE.ShaderMaterial({
    uniforms: {
      uVideo: { value: videoTex },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.0) },
      uMouseActive: { value: 0 },
      uTime: { value: 0 },
      uRippleAmp: { value: cfg.lakeRipple },
      uTint: { value: new THREE.Vector3(...cfg.lakeTint) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG_LAKE,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const geo = new THREE.PlaneGeometry(2, 2);
  const slabMesh = new THREE.Mesh(geo, slabMat);
  const lakeMesh = new THREE.Mesh(geo, lakeMat);
  /* Lake renders below slab — both via discard so order matters only
     for blend math, but draw lake first for a tidier accumulation. */
  scene.add(lakeMesh);
  scene.add(slabMesh);

  const setSize = (): void => {
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(r.width, r.height, false);
    slabMat.uniforms.uResolution.value.set(r.width * dpr, r.height * dpr);
    lakeMat.uniforms.uResolution.value.set(r.width * dpr, r.height * dpr);
  };
  setSize();

  /* Cursor tracked at section level. Shared across slab + lake.
     For the slab, we map cursor → slab-local UV (clamped 0..1).
     For the lake, we map cursor → lake-local UV (the bottom band). */
  let mouseTargetActive = 0;
  let mouseFracX = 0.5;
  let mouseFracY = 0.5;
  const onMove = (e: PointerEvent): void => {
    const r = target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    ) {
      mouseTargetActive = 0;
      return;
    }
    mouseFracX = (e.clientX - r.left) / r.width;
    mouseFracY = (e.clientY - r.top) / r.height;
    mouseTargetActive = 1;
  };
  const onLeave = (): void => {
    mouseTargetActive = 0;
  };
  window.addEventListener('pointermove', onMove);
  target.addEventListener('pointerleave', onLeave);

  let raf = 0;
  let running = true;
  const start = performance.now();

  const frame = (): void => {
    if (!running) return;
    const t = (performance.now() - start) / 1000;
    slabMat.uniforms.uTime.value = t;
    lakeMat.uniforms.uTime.value = t;

    /* Smoothed activity / position. */
    const cur = slabMat.uniforms.uMouseActive.value as number;
    const next = cur + (mouseTargetActive - cur) * 0.08;
    slabMat.uniforms.uMouseActive.value = next;
    lakeMat.uniforms.uMouseActive.value = next;

    /* Slab uMouse in slab-local UV — clamped to the rect for soft
       on/off as the cursor enters/leaves the slab footprint. */
    const slabLocalX = (mouseFracX - slabRect.x) / slabRect.z;
    const slabLocalY = (mouseFracY - slabRect.y) / slabRect.w;
    (slabMat.uniforms.uMouse.value as THREE.Vector2).set(
      Math.max(0, Math.min(1, slabLocalX)),
      Math.max(0, Math.min(1, slabLocalY))
    );

    /* Lake uMouse in lake-local UV (bottom 38% band). y is inverted
       since lake origin is at the bottom. */
    const lakeLocalY = (1 - mouseFracY) / 0.38;
    (lakeMat.uniforms.uMouse.value as THREE.Vector2).set(
      mouseFracX,
      Math.max(0, Math.min(1, lakeLocalY))
    );

    renderer.clear();
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
      window.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerleave', onLeave);
      ro.disconnect();
      io?.disconnect();
      geo.dispose();
      slabMat.dispose();
      lakeMat.dispose();
      videoTex.dispose();
      renderer.dispose();
      wrap.remove();
    },
  };
}
