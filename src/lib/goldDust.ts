/**
 * goldDust — ambient floating gold particles drifting across the
 * /process/ page. Three.js InstancedMesh with ~40 quads, each a tiny
 * additive blob lit by cursor proximity. Same chromatic vocabulary
 * as the kintsugi menu debris but ATMOSPHERIC, not impact-driven.
 *
 * Runs on a fixed full-viewport canvas behind the page UI. Pauses
 * via IntersectionObserver on document.body (cheap) and gates on
 * prefers-reduced-motion / motion-off.
 */

import * as THREE from 'three';

export interface GoldDustHandle {
  dispose(): void;
}

const VERT = /* glsl */ `
  attribute vec2 aOffset;        // per-instance world position 0..1
  attribute float aSize;         // per-instance px size
  attribute float aSeed;         // per-instance random seed (0..1)

  uniform vec2 uResolution;
  uniform float uTime;

  varying vec2 vLocal;
  varying float vSeed;

  void main() {
    /* Drift each particle along its own slow trajectory. Sine-based
       so movement is smooth + recurrent (no boundary teleport). */
    vec2 drift = vec2(
      sin(uTime * 0.18 + aSeed * 6.28) * 0.04,
      sin(uTime * 0.22 + aSeed * 9.81) * 0.035
    );
    vec2 worldUV = mod(aOffset + drift, vec2(1.0));

    /* Convert worldUV (0..1) → NDC */
    vec2 ndc = worldUV * 2.0 - 1.0;
    /* Scale the unit-quad position by aSize px and aspect-correct */
    vec2 pxToNdc = vec2(2.0 / uResolution.x, 2.0 / uResolution.y);
    vec2 size = position.xy * aSize * pxToNdc;
    gl_Position = vec4(ndc + size, 0.0, 1.0);

    vLocal = position.xy;
    vSeed = aSeed;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uColor;
  varying vec2 vLocal;
  varying float vSeed;

  void main() {
    float d = length(vLocal);
    if (d > 1.0) discard;

    /* Gaussian core + soft outer glow */
    float core = exp(-d * d * 14.0);
    float halo = exp(-d * d * 3.5) * 0.42;

    /* Pulse the alpha per-particle so the field shimmers */
    float pulse = 0.55 + 0.45 * sin(uTime * 0.9 + vSeed * 12.4);

    vec3 col = uColor * (core + halo * 0.6);
    float a = (core + halo) * pulse * 0.9;

    gl_FragColor = vec4(col, a);
  }
`;

export function initGoldDust(): GoldDustHandle | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  if (document.documentElement.classList.contains('motion-off')) return null;
  // Mobile crash gate — see prismGL.ts. Gold dust runs a continuous
  // WebGL particle shader at fullscreen with mix-blend-mode: screen.
  // On mobile this stacks with the page's other GL contexts and the
  // device class can't hold them all in memory. Drop the dust on
  // phones — the page reads fine without it.
  if (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 900px)').matches
  ) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'gold-dust-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

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

  /* Per-instance buffers */
  const COUNT = 40;
  const offsets = new Float32Array(COUNT * 2);
  const sizes = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    offsets[i * 2 + 0] = Math.random();
    offsets[i * 2 + 1] = Math.random();
    sizes[i] = 4 + Math.random() * 7;     // 4..11 px
    seeds[i] = Math.random();
  }

  const baseGeo = new THREE.PlaneGeometry(2, 2);  /* unit quad, will be scaled in vertex shader */
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', baseGeo.getAttribute('position'));
  geo.setAttribute('uv', baseGeo.getAttribute('uv'));
  geo.setIndex(baseGeo.getIndex());
  geo.instanceCount = COUNT;
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 2));
  geo.setAttribute('aSize',   new THREE.InstancedBufferAttribute(sizes, 1));
  geo.setAttribute('aSeed',   new THREE.InstancedBufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uColor: { value: new THREE.Vector3(1.0, 0.82, 0.4) }, /* warm gold */
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  const setSize = (): void => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    mat.uniforms.uResolution.value.set(w * dpr, h * dpr);
  };
  setSize();
  window.addEventListener('resize', setSize);

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

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setSize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
