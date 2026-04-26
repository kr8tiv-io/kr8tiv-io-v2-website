/**
 * katanaTrail — cursor-drawn chromatic-aberration ribbon. The user
 * literally slashes the page; the trail decays over ~1.5 s with proper
 * RGB channel split along the perpendicular to recent velocity, so the
 * mark reads as a katana edge cutting glass instead of a generic mouse
 * trail.
 *
 * Architecture:
 *   1. Ping-pong FBOs for trail accumulation.  Each frame:
 *        prev * fade  +  bright dot at cursor  →  new
 *      (Velocity-modulated brightness — slow draws are thin and dim,
 *      fast slashes write hot, wide stripes.)
 *   2. Display pass samples the accumulated trail texture three times
 *      per pixel, offset along the cursor's recent velocity vector,
 *      packing R/G/B channels independently.  The result is true
 *      chromatic aberration — magenta pulled one way, cyan the other,
 *      white core where they overlap.
 *
 * Gates:
 *   · prefers-reduced-motion / html.motion-off → returns null
 *   · IntersectionObserver pauses the rAF when off-screen
 *   · ResizeObserver re-allocates FBOs at the new pixel size
 */

import * as THREE from 'three';

export interface KatanaTrailHandle {
  dispose(): void;
}

export interface KatanaTrailOptions {
  /** RGB 0..1 (default white-pink #ff8cdb). */
  color?: [number, number, number];
  /** Multiplier per frame on the trail buffer (default 0.93). */
  trailFade?: number;
  /** Base brush radius in CSS px (default 10). */
  brushSize?: number;
  /** Chromatic split distance in CSS px (default 5). */
  chromaticOffset?: number;
  /** How much velocity boosts brightness (default 80). */
  velocityBoost?: number;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/* Accumulation pass: read prev frame, fade it, add a fresh velocity-
   weighted Gaussian dot at the cursor.  Output is a single-channel-
   like luminance buffer that the display pass will chromatically
   split — keeping per-channel logic out of the heavy accumulation. */
const FRAG_ACCUM = /* glsl */ `
  precision highp float;

  uniform sampler2D uPrev;
  uniform vec2  uResolution;
  uniform vec2  uCursor;          // device-px
  uniform float uBrushSize;       // device-px σ
  uniform float uTrailFade;
  uniform float uIntensity;       // 0..1, scales with velocity magnitude

  varying vec2 vUv;

  void main() {
    vec4 prev = texture2D(uPrev, vUv);
    prev *= uTrailFade;

    vec2 px = vUv * uResolution;
    float d = length(px - uCursor);
    float core = exp(-d * d / (2.0 * uBrushSize * uBrushSize));
    float halo = exp(-d * d / (2.0 * (uBrushSize * 3.5) * (uBrushSize * 3.5))) * 0.35;
    float add = (core + halo) * uIntensity;

    gl_FragColor = vec4(prev.rgb + vec3(add), max(prev.a, add));
  }
`;

/* Display pass: sample the trail texture three times — once each for
   R, G, B — with a small offset along the cursor's velocity direction.
   Magenta lands one side, cyan the other, white where all three
   overlap.  Same trick the hero's WebGL prism uses. */
const FRAG_DISPLAY = /* glsl */ `
  precision highp float;

  uniform sampler2D uTrail;
  uniform vec2  uResolution;
  uniform vec2  uVelDir;          // unit vector
  uniform float uChromaticOffset; // device-px
  uniform vec3  uTint;

  varying vec2 vUv;

  void main() {
    vec2 off = uVelDir * uChromaticOffset / uResolution;

    float r = texture2D(uTrail, vUv + off).r;
    float g = texture2D(uTrail, vUv).g;
    float b = texture2D(uTrail, vUv - off).b;

    vec3 col = vec3(r, g, b) * uTint;

    /* Subtle bloom by sampling neighbouring pixels at radius. */
    vec2 step = 2.0 / uResolution;
    vec3 bloom = (
        texture2D(uTrail, vUv + vec2( step.x,  step.y)).rgb +
        texture2D(uTrail, vUv + vec2(-step.x,  step.y)).rgb +
        texture2D(uTrail, vUv + vec2( step.x, -step.y)).rgb +
        texture2D(uTrail, vUv + vec2(-step.x, -step.y)).rgb
      ) * 0.18;
    col += bloom * uTint;

    float a = max(max(r, g), b);
    gl_FragColor = vec4(col, a);
  }
`;

export function initKatanaTrail(
  target: HTMLElement,
  opts: KatanaTrailOptions = {}
): KatanaTrailHandle | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  if (document.documentElement.classList.contains('motion-off')) return null;

  const cfg = {
    color: opts.color ?? ([1.0, 0.55, 0.86] as [number, number, number]),
    trailFade: opts.trailFade ?? 0.93,
    brushSize: opts.brushSize ?? 10,
    chromaticOffset: opts.chromaticOffset ?? 5,
    velocityBoost: opts.velocityBoost ?? 80,
  };

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;' +
    'mix-blend-mode:screen;z-index:3;';
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
      powerPreference: 'high-performance',
    });
  } catch {
    canvas.remove();
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new THREE.PlaneGeometry(2, 2);

  const accumMat = new THREE.ShaderMaterial({
    uniforms: {
      uPrev: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCursor: { value: new THREE.Vector2(-1e6, -1e6) },
      uBrushSize: { value: cfg.brushSize },
      uTrailFade: { value: cfg.trailFade },
      uIntensity: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG_ACCUM,
    depthTest: false,
    depthWrite: false,
  });
  const displayMat = new THREE.ShaderMaterial({
    uniforms: {
      uTrail: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uVelDir: { value: new THREE.Vector2(1, 0) },
      uChromaticOffset: { value: cfg.chromaticOffset },
      uTint: { value: new THREE.Vector3(...cfg.color) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG_DISPLAY,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const accumMesh = new THREE.Mesh(geo, accumMat);
  const displayMesh = new THREE.Mesh(geo, displayMat);

  /* Two FBOs ping-ponged each frame so the accumulation pass can read
     last frame's trail while writing the next one. */
  let rtA: THREE.WebGLRenderTarget | null = null;
  let rtB: THREE.WebGLRenderTarget | null = null;
  let toggle = false;

  const allocRTs = (w: number, h: number): void => {
    rtA?.dispose();
    rtB?.dispose();
    const params = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    };
    rtA = new THREE.WebGLRenderTarget(w, h, params);
    rtB = new THREE.WebGLRenderTarget(w, h, params);
    /* Clear them so the first frame doesn't sample undefined memory. */
    renderer.setRenderTarget(rtA);
    renderer.clear();
    renderer.setRenderTarget(rtB);
    renderer.clear();
    renderer.setRenderTarget(null);
  };

  const setSize = (): void => {
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(r.width, r.height, false);
    const w = Math.round(r.width * dpr);
    const h = Math.round(r.height * dpr);
    accumMat.uniforms.uResolution.value.set(w, h);
    displayMat.uniforms.uResolution.value.set(w, h);
    accumMat.uniforms.uBrushSize.value = cfg.brushSize * dpr;
    displayMat.uniforms.uChromaticOffset.value = cfg.chromaticOffset * dpr;
    allocRTs(w, h);
  };
  setSize();

  /* Cursor + velocity tracking — listening on window so the trail
     keeps drawing even when the cursor is over the title overlay
     above the canvas (pointer-events:none on canvas anyway). */
  let cursorX = -1e6;
  let cursorY = -1e6;
  let prevX = -1e6;
  let prevY = -1e6;
  let velX = 0;
  let velY = 0;
  let intensity = 0;
  const onMove = (e: PointerEvent): void => {
    const r = target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    ) {
      cursorX = -1e6;
      cursorY = -1e6;
      return;
    }
    cursorX = (e.clientX - r.left);
    cursorY = (e.clientY - r.top);
  };
  window.addEventListener('pointermove', onMove);

  /* rAF loop. */
  let raf = 0;
  let running = true;
  const frame = (): void => {
    if (!running) return;

    /* Velocity update — smoothed. */
    if (cursorX > -1e5) {
      const dx = cursorX - prevX;
      const dy = cursorY - prevY;
      const speed = Math.hypot(dx, dy);
      velX = velX * 0.7 + dx * 0.3;
      velY = velY * 0.7 + dy * 0.3;
      const targetIntensity = Math.min(speed / 14, 1.6);
      intensity = intensity * 0.7 + targetIntensity * 0.3;
      prevX = cursorX;
      prevY = cursorY;
    } else {
      intensity *= 0.85;
    }

    const dpr = renderer.getPixelRatio();
    const cursorPxX = cursorX * dpr;
    const cursorPxY = (target.getBoundingClientRect().height - cursorY) * dpr;
    accumMat.uniforms.uCursor.value.set(cursorPxX, cursorPxY);
    accumMat.uniforms.uIntensity.value = intensity;

    /* Velocity direction for the display pass chromatic split.
       Defaults to horizontal if cursor is idle. */
    const vmag = Math.hypot(velX, velY);
    if (vmag > 0.5) {
      displayMat.uniforms.uVelDir.value.set(velX / vmag, -velY / vmag);
    }

    /* Ping-pong accumulation. */
    if (rtA && rtB) {
      const src = toggle ? rtA : rtB;
      const dst = toggle ? rtB : rtA;
      accumMat.uniforms.uPrev.value = src.texture;
      scene.clear();
      scene.add(accumMesh);
      renderer.setRenderTarget(dst);
      renderer.render(scene, camera);

      /* Display. */
      displayMat.uniforms.uTrail.value = dst.texture;
      scene.clear();
      scene.add(displayMesh);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);

      toggle = !toggle;
    }

    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  /* Resize. */
  const ro = new ResizeObserver(setSize);
  ro.observe(target);

  /* Pause when off-screen. */
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
      ro.disconnect();
      io?.disconnect();
      rtA?.dispose();
      rtB?.dispose();
      geo.dispose();
      accumMat.dispose();
      displayMat.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
