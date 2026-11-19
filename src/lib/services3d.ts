/**
 * services3d — three real models inside the services scroller.
 *
 * Website Design, Video Editing, and Motion + 3D drop the circular
 * video. The other eight panels are untouched. One WebGLRenderer and
 * one canvas cover `#svc-pin`; each frame we read the visible
 * `.svc-model` slots and draw that slot's scene with setViewport +
 * setScissor (the "many scenes, one canvas" pattern). The canvas is
 * transparent, so the section ground shows through and the copy —
 * which lives in the transformed track, painted after this layer —
 * stays sharp.
 *
 * three.js is dynamically imported the first time #services is within
 * about a viewport, so it stays out of the initial bundle. Reduced
 * motion, a weak phone, a missing WebGL2 context, a lost context, or
 * a sustained >40ms frame all drop every model back to its still.
 */

import {
  isPhoneClassTouch,
  prefersReducedMotion,
  motionEffectsDisabled,
} from '@lib/devicePolicy';
import type {
  BufferGeometry,
  Group,
  Material,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

type Kind = 'laptop' | 'film' | 'gyro';
type StillReason = 'motion' | 'weak' | 'webgl' | 'fps' | 'context';
type GimbalAxis = 'x' | 'y' | 'xy';

interface Gimbal {
  node: Object3D;
  axis: GimbalAxis;
  /** Radians per second, local axis. */
  speed: number;
}

interface Slot {
  el: HTMLElement;
  frame: HTMLElement;
  bloom: HTMLElement | null;
  url: string;
  kind: Kind;
  scene: Scene;
  camera: PerspectiveCamera;
  /** Scroll yaw + idle spin + bob live here. */
  pivot: Group;
  radius: number;
  /** Lerped horizontal-scroll component, radians. */
  scrollYaw: number;
  scrollReady: boolean;
  phase: number;
  gimbals: Gimbal[];
  ready: boolean;
  failed: boolean;
  /** Last aspect we fitted the camera to. */
  aspect: number;
}

/** Sphere diameter as a fraction of the slot's limiting dimension. */
const FILL = 0.8;
/** Camera elevation above the horizon, radians. Same rig for every slot. */
const ELEV = 0.38;
const FOV = 30;
/** Scroll across the viewport maps to this much yaw, radians. */
const SCROLL_YAW = 1.2;
/** Continuous yaw on top of the scroll pose, radians per second. */
const IDLE_YAW = 0.15;
/** Exponential smoothing rate for the scroll component. */
const SCROLL_LERP = 8;
const BOB_AMP = 0.04;
const BOB_SPEED = 0.9;

const PRESENT_YAW: Record<Kind, number> = {
  /* Laptop glTF faces +z (trackpad at +z, hinge at −z). A small yaw
     shows the lid's thickness without hiding the screen. */
  laptop: 0.42,
  film: 0.2,
  gyro: 0.35,
};

const GIMBALS: Record<string, { axis: GimbalAxis; speed: number }> = {
  // TorusGeometry sits in the gimbal's local XY plane, so a spin on
  // local Z is the ring's symmetry axis and reads as still. Y, X, and
  // the XY diagonal are three different tumble axes.
  ring_outer_gimbal: { axis: 'y', speed: 0.45 },
  ring_mid_gimbal: { axis: 'x', speed: -0.72 },
  ring_inner_gimbal: { axis: 'xy', speed: 1.15 },
};

interface NavigatorMemory extends Navigator {
  deviceMemory?: number;
}

function motionBlocked(): boolean {
  return prefersReducedMotion() || motionEffectsDisabled();
}

/** Phones with few cores or little RAM stay on the still. A missing
 *  deviceMemory (Firefox, Safari) does not count as weak. */
function isWeakPhone(): boolean {
  if (!isPhoneClassTouch()) return false;
  const cores = navigator.hardwareConcurrency;
  const mem = (navigator as NavigatorMemory).deviceMemory;
  const lowCores = typeof cores === 'number' && cores > 0 && cores <= 4;
  const lowMem = typeof mem === 'number' && mem > 0 && mem <= 3;
  return lowCores || lowMem;
}

function isPhoneTier(): boolean {
  return isPhoneClassTouch();
}

function kindOf(url: string): Kind {
  if (url.includes('gyro')) return 'gyro';
  if (url.includes('mobius') || url.includes('film')) return 'film';
  return 'laptop';
}

function markStills(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.svc-frame--model').forEach((frame) => {
    frame.classList.remove('is-webgl');
    frame.classList.add('is-still');
  });
}

function dropBrokenStills(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>('.svc-model-still').forEach((img) => {
    const drop = (): void => { img.remove(); };
    img.addEventListener('error', drop);
    if (img.complete && img.naturalWidth === 0) drop();
  });
}

/**
 * Mount the services models. Returns a disposer. Safe to call when
 * the section has no model slots — it no-ops.
 */
export function mountServices3D(root: HTMLElement): () => void {
  const pin = root.querySelector<HTMLElement>('#svc-pin');
  const slotEls = [...root.querySelectorAll<HTMLElement>('.svc-model')];
  if (!pin || slotEls.length === 0) return () => {};
  if (root.dataset.svc3d === 'on') return () => {};
  root.dataset.svc3d = 'on';

  dropBrokenStills(root);

  let disposed = false;
  let mode: 'idle' | 'booting' | 'webgl' | 'still' = 'idle';
  let stillReason: StillReason | null = null;
  let token = 0;
  let teardownGpu: (() => void) | null = null;
  // Set as soon as a context exists, before the render loop's teardown
  // is wired, so a failed load or an early unmount still frees the GPU.
  let releaseGpu: (() => void) | null = null;

  const showStills = (reason: StillReason): void => {
    stillReason = reason;
    mode = 'still';
    markStills(root);
  };

  const dropGpu = (): void => {
    const full = teardownGpu;
    teardownGpu = null;
    const early = releaseGpu;
    releaseGpu = null;
    if (full) full();
    else early?.();
  };

  const killGpu = (reason: StillReason): void => {
    token += 1;
    dropGpu();
    showStills(reason);
  };

  const maybeBoot = (): void => {
    if (disposed || mode === 'webgl' || mode === 'booting') return;
    if (stillReason === 'weak' || stillReason === 'webgl' || stillReason === 'fps' || stillReason === 'context') return;
    if (motionBlocked()) {
      showStills('motion');
      return;
    }
    if (isWeakPhone()) {
      showStills('weak');
      preload.disconnect();
      return;
    }
    mode = 'booting';
    preload.disconnect();
    const my = ++token;
    void boot(my);
  };

  // ~1 viewport early, so the GLBs are in flight before the pin hits.
  const preload = new IntersectionObserver((entries) => {
    if (disposed) return;
    if (!entries.some((e) => e.isIntersecting)) return;
    maybeBoot();
  }, { root: null, rootMargin: '100% 0px', threshold: 0 });
  preload.observe(root);

  const onMotion = (): void => {
    if (disposed) return;
    if (motionBlocked()) {
      if (mode === 'webgl' || mode === 'booting') killGpu('motion');
      else showStills('motion');
      return;
    }
    if (mode === 'still' && stillReason === 'motion') maybeBoot();
  };
  const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionMq.addEventListener('change', onMotion);
  const classObs = new MutationObserver(onMotion);
  classObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // Already on screen (deep link, refresh mid-page) — the observer
  // also fires, but a synchronous check covers a missed first tick.
  if (sectionIsNear(root)) maybeBoot();

  async function boot(my: number): Promise<void> {
    const alive = (): boolean => !disposed && my === token && !motionBlocked();
    try {
      const THREE = await import('three');
      if (!alive()) return;

      const phone = isPhoneTier();
      const canvas = document.createElement('canvas');
      canvas.className = 'svc-webgl';
      canvas.setAttribute('aria-hidden', 'true');
      const gl = canvas.getContext('webgl2', {
        alpha: true,
        antialias: !phone,
        depth: true,
        stencil: false,
        premultipliedAlpha: true,
        powerPreference: phone ? 'low-power' : 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
      if (!gl) {
        if (alive()) killGpu('webgl');
        return;
      }

      const renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl,
        alpha: true,
        antialias: !phone,
        premultipliedAlpha: true,
        powerPreference: phone ? 'low-power' : 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setClearColor(0x000000, 0);
      renderer.autoClear = false;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.25 : 1.5));
      const layer = document.createElement('div');
      layer.className = 'svc-webgl-layer';
      layer.setAttribute('aria-hidden', 'true');
      layer.append(canvas);
      pin!.prepend(layer);
      resizeRenderer(renderer, pin!);
      // Replaced once the env + slots exist. Covers a throw during
      // environment build, before the full disposer is assigned.
      releaseGpu = () => {
        renderer.dispose();
        renderer.forceContextLoss();
        layer.remove();
      };

      // Dark coloured PMREM, shared. RoomEnvironment is a white studio;
      // its reflections draw a hard pale rim on the obsidian body, which
      // is the opposite of an edge melting into #050507. Capture it
      // before ACES so the env isn't tone-mapped twice.
      const envTarget = buildDarkEnv(THREE, renderer);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      const envMap = envTarget.texture;

      const glow = makeGlowTexture(THREE);

      const slots: Slot[] = [];
      releaseGpu = () => { disposeGpu(renderer, envTarget, glow, slots, layer); };
      slotEls.forEach((el, index) => {
        const frame = el.closest<HTMLElement>('.svc-frame--model');
        const url = el.dataset.model;
        if (!frame || !url) return;
        const bloom = frame.querySelector<HTMLElement>('.svc-model-bloom');
        const scene = new THREE.Scene();
        scene.environment = envMap;
        scene.environmentIntensity = 0.7;
        scene.background = null;
        addLights(THREE, scene);
        const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 50);
        const pivot = new THREE.Group();
        scene.add(pivot);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glow,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          opacity: 0.9,
          toneMapped: true,
        }));
        sprite.renderOrder = -1;
        sprite.name = 'bloom-sprite';
        pivot.add(sprite);
        frame.classList.add('is-webgl');
        if (bloom) layer.append(bloom);
        slots.push({
          el,
          frame,
          bloom,
          url,
          kind: kindOf(url),
          scene,
          camera,
          pivot,
          radius: 1,
          scrollYaw: 0,
          scrollReady: false,
          phase: index * 2.05,
          gimbals: [],
          ready: false,
          failed: false,
          aspect: 0,
        });
      });

      if (!alive()) {
        dropGpu();
        return;
      }

      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
      if (MeshoptDecoder.ready) await MeshoptDecoder.ready;
      if (!alive()) {
        dropGpu();
        return;
      }
      if (!MeshoptDecoder.supported) {
        if (alive()) killGpu('webgl');
        else dropGpu();
        return;
      }

      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);

      await Promise.all(slots.map(async (slot) => {
        try {
          const gltf = await loader.loadAsync(slot.url);
          if (!alive()) return;
          mountModel(THREE, slot, gltf.scene);
          slot.ready = true;
        } catch (err) {
          slot.failed = true;
          slot.frame.classList.remove('is-webgl');
          slot.frame.classList.add('is-still');
          restoreBloom(slot);
          console.warn('[KR8·services3d] model failed:', slot.url, err);
        }
      }));

      if (!alive()) {
        dropGpu();
        return;
      }

      const live = slots.filter((s) => s.ready);
      if (live.length === 0) {
        if (alive()) killGpu('webgl');
        else dropGpu();
        return;
      }

      // Compile programs now so the FPS window measures steady frames,
      // not the first shader link.
      warmShaders(renderer, live);
      resizeRenderer(renderer, pin!);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, pin!.clientWidth, pin!.clientHeight);
      renderer.clear(true, true, true);

      mode = 'webgl';
      let raf = 0;
      let running = false;
      let inView = false;
      let last = performance.now();
      let elapsed = 0;
      let fpsFrames = 0;
      let fpsSum = 0;
      let fpsWarm = 0;
      let fpsDone = false;
      const onLost = (event: Event): void => {
        event.preventDefault();
        killGpu('context');
      };
      canvas.addEventListener('webglcontextlost', onLost);

      const frame = (now: number): void => {
        raf = 0;
        if (!running || disposed || my !== token) return;
        const raw = (now - last) / 1000;
        last = now;
        const dt = Math.min(0.05, Math.max(0, raw));
        elapsed += dt;

        if (!fpsDone) {
          // Drop the first frames and any single stall (shader link,
          // tab wake). The guard is the sustained rate over ~2s.
          if (fpsWarm < 8) fpsWarm += 1;
          else if (raw < 0.25) {
            fpsFrames += 1;
            fpsSum += raw;
            if (fpsSum >= 2 && fpsFrames >= 20 && (fpsSum / fpsFrames) > 0.04) {
              killGpu('fps');
              return;
            }
            if (fpsSum >= 2) fpsDone = true;
          }
        }

        const canvasRect = canvas.getBoundingClientRect();
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        if (cssW < 2 || cssH < 2) {
          raf = requestAnimationFrame(frame);
          return;
        }

        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, cssW, cssH);
        renderer.clear(true, true, true);
        renderer.setScissorTest(true);

        const scaleX = canvasRect.width > 0 ? cssW / canvasRect.width : 1;
        const scaleY = canvasRect.height > 0 ? cssH / canvasRect.height : 1;

        for (const slot of live) {
          const rect = slot.el.getBoundingClientRect();
          placeBloom(slot, rect, canvasRect);
          if (!slot.ready) continue;
          const x = (rect.left - canvasRect.left) * scaleX;
          const yTop = (rect.top - canvasRect.top) * scaleY;
          const w = rect.width * scaleX;
          const h = rect.height * scaleY;
          // WebGL's origin is the bottom-left of the canvas.
          const y = cssH - (yTop + h);
          if (w < 2 || h < 2) continue;
          if (x + w <= 0 || y + h <= 0 || x >= cssW || y >= cssH) continue;

          const aspect = w / h;
          if (Math.abs(aspect - slot.aspect) > 0.01) {
            fitCamera(THREE, slot.camera, slot.radius, aspect);
            slot.aspect = aspect;
          }

          const cx = rect.left + rect.width * 0.5;
          const nx = (cx - window.innerWidth * 0.5) / (window.innerWidth * 0.5);
          // Negated so a slot on the right of the screen yaws back
          // toward centre. ±1 at the viewport edges, clamped to ±1.2.
          const target = THREE.MathUtils.clamp(nx, -1, 1) * -SCROLL_YAW;
          if (!slot.scrollReady) {
            slot.scrollYaw = target;
            slot.scrollReady = true;
          } else {
            const k = 1 - Math.exp(-dt * SCROLL_LERP);
            slot.scrollYaw += (target - slot.scrollYaw) * k;
          }
          slot.pivot.rotation.y = slot.scrollYaw + elapsed * IDLE_YAW;
          slot.pivot.position.y = Math.sin(elapsed * BOB_SPEED + slot.phase) * slot.radius * BOB_AMP;

          for (const gimbal of slot.gimbals) {
            const a = gimbal.speed * dt;
            if (gimbal.axis === 'x') gimbal.node.rotateX(a);
            else if (gimbal.axis === 'y') gimbal.node.rotateY(a);
            else {
              const h = a * 0.70710678118;
              gimbal.node.rotateX(h);
              gimbal.node.rotateY(h);
            }
          }

          const sx = Math.max(0, x);
          const sy = Math.max(0, y);
          const sr = Math.min(cssW, x + w);
          const st = Math.min(cssH, y + h);
          renderer.setViewport(x, y, w, h);
          renderer.setScissor(sx, sy, Math.max(0, sr - sx), Math.max(0, st - sy));
          renderer.clear(false, true, false);
          renderer.render(slot.scene, slot.camera);
        }

        raf = requestAnimationFrame(frame);
      };

      const startLoop = (): void => {
        if (running || disposed || my !== token) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };
      const stopLoop = (): void => {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      };
      const syncLoop = (): void => {
        if (inView && !document.hidden && !disposed && my === token) startLoop();
        else stopLoop();
      };

      const runObserver = new IntersectionObserver((entries) => {
        inView = entries.some((e) => e.isIntersecting);
        syncLoop();
      }, { root: null, rootMargin: '15% 0px', threshold: 0 });
      runObserver.observe(pin!);
      inView = pinIsNear(pin!);
      const onVis = (): void => { syncLoop(); };
      document.addEventListener('visibilitychange', onVis);

      const onResize = (): void => {
        if (disposed || my !== token) return;
        resizeRenderer(renderer, pin!);
        // The pin's ScrollTrigger measures the track itself; nudge it
        // so a rotation / width change doesn't leave the last panel short.
        void import('gsap/ScrollTrigger').then((mod) => {
          if (!disposed && my === token) mod.ScrollTrigger.refresh();
        }).catch(() => { /* GSAP missing — the renderer resize still holds. */ });
      };
      const ro = new ResizeObserver(() => {
        if (disposed || my !== token) return;
        resizeRenderer(renderer, pin!);
      });
      ro.observe(pin!);
      window.addEventListener('resize', onResize);

      teardownGpu = () => {
        stopLoop();
        runObserver.disconnect();
        ro.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('resize', onResize);
        canvas.removeEventListener('webglcontextlost', onLost);
        disposeGpu(renderer, envTarget, glow, slots, layer);
      };

      syncLoop();
    } catch (err) {
      console.warn('[KR8·services3d] WebGL unavailable:', err);
      if (!disposed && mode !== 'still') killGpu('webgl');
      else dropGpu();
    }
  }

  return () => {
    disposed = true;
    token += 1;
    preload.disconnect();
    motionMq.removeEventListener('change', onMotion);
    classObs.disconnect();
    dropGpu();
    delete root.dataset.svc3d;
  };
}

function sectionIsNear(root: HTMLElement): boolean {
  const r = root.getBoundingClientRect();
  const h = window.innerHeight || 1;
  return r.bottom > -h && r.top < h * 2;
}

function pinIsNear(pin: HTMLElement): boolean {
  const r = pin.getBoundingClientRect();
  const h = window.innerHeight || 1;
  return r.bottom > -h * 0.15 && r.top < h * 1.15;
}

function resizeRenderer(renderer: WebGLRenderer, pin: HTMLElement): void {
  const w = pin.clientWidth;
  const h = pin.clientHeight;
  if (w < 2 || h < 2) return;
  const phone = isPhoneTier();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.25 : 1.5));
  renderer.setSize(w, h, false);
}

function placeBloom(slot: Slot, rect: DOMRect, canvasRect: DOMRect): void {
  const bloom = slot.bloom;
  if (!bloom) return;
  if (rect.width < 2 || rect.height < 2) {
    bloom.style.visibility = 'hidden';
    return;
  }
  // Match the CSS inset: -28% pad around the slot.
  const padX = rect.width * 0.28;
  const padY = rect.height * 0.28;
  bloom.style.visibility = 'visible';
  bloom.style.left = `${rect.left - canvasRect.left - padX}px`;
  bloom.style.top = `${rect.top - canvasRect.top - padY}px`;
  bloom.style.width = `${rect.width + padX * 2}px`;
  bloom.style.height = `${rect.height + padY * 2}px`;
}

function restoreBloom(slot: Slot): void {
  const bloom = slot.bloom;
  if (!bloom) return;
  bloom.style.left = '';
  bloom.style.top = '';
  bloom.style.width = '';
  bloom.style.height = '';
  bloom.style.visibility = '';
  if (bloom.parentElement !== slot.frame) slot.frame.insertBefore(bloom, slot.frame.firstChild);
}

/**
 * Camera sits on +z, a little above the horizon, looking at the origin.
 * Three.js cameras look down their local −z, so this sees the model's
 * +z face. Laptop nodes put the trackpad at +z and the hinge at −z,
 * so +z is the side a person sitting at the machine would see.
 * Distance is chosen so the bounding sphere fills FILL of the slot.
 */
function fitCamera(
  THREE: typeof import('three'),
  camera: PerspectiveCamera,
  radius: number,
  aspect: number,
): void {
  camera.fov = FOV;
  camera.aspect = aspect;
  const vFov = THREE.MathUtils.degToRad(FOV);
  const tanV = Math.tan(vFov / 2);
  const tanH = tanV * Math.max(aspect, 0.01);
  const dist = radius / (FILL * Math.min(tanV, tanH));
  camera.position.set(0, Math.sin(ELEV) * dist, Math.cos(ELEV) * dist);
  camera.near = Math.max(0.01, dist - radius * 6);
  camera.far = dist + radius * 12;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function mountModel(THREE: typeof import('three'), slot: Slot, model: Group): void {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = Math.max(sphere.radius, 0.001);
  // gltf.scene is an identity group; shifting its position by the
  // world-space centre parks the bounds on the pivot origin.
  model.position.sub(sphere.center);
  const posed = new THREE.Group();
  posed.rotation.y = PRESENT_YAW[slot.kind];
  posed.add(model);
  slot.pivot.add(posed);
  slot.radius = r;

  const sprite = slot.pivot.getObjectByName('bloom-sprite');
  if (sprite) sprite.scale.set(r * 4.4, r * 4.4, 1);

  model.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat || !('envMapIntensity' in mat)) continue;
      const named = mat as Material & { name: string; envMapIntensity: number };
      named.envMapIntensity = envIntensityFor(named.name);
    }
  });

  if (slot.kind === 'gyro') {
    for (const [name, spec] of Object.entries(GIMBALS)) {
      const node = model.getObjectByName(name);
      if (!node) continue;
      slot.gimbals.push({ node, axis: spec.axis, speed: spec.speed });
    }
  }

  fitCamera(THREE, slot.camera, r, 1);
  slot.aspect = 1;
}

function envIntensityFor(name: string): number {
  switch (name) {
    case 'obsidian': return 1.15;
    case 'rim_rosegold': return 0.85;
    case 'screen_prism': return 0.4;
    case 'film_iridescent': return 1.4;
    case 'gold': return 1.05;
    case 'lilac_chrome': return 1.25;
    case 'chrome': return 1.1;
    case 'magenta_glass_orb': return 1.3;
    default: return 1;
  }
}

function addLights(THREE: typeof import('three'), scene: Scene): void {
  // Magenta key from the front-right, purple rim from behind-left,
  // gold from above. The ambient is a trace of the same purple so
  // unlit faces fall into the page instead of a grey fill.
  const key = new THREE.DirectionalLight(0xff6ad5, 4.2);
  key.position.set(3.2, 2.4, 5.4);
  const rim = new THREE.DirectionalLight(0x8e00ff, 5.4);
  rim.position.set(-5.2, 1.6, -3.4);
  const top = new THREE.DirectionalLight(0xffd166, 2.6);
  top.position.set(0.3, 7.4, 0.6);
  const fill = new THREE.DirectionalLight(0x2a1028, 1.15);
  fill.position.set(-0.4, 0.3, 6.2);
  const amb = new THREE.AmbientLight(0x120614, 0.55);
  scene.add(key, rim, top, fill, amb);
}

function buildDarkEnv(
  THREE: typeof import('three'),
  renderer: WebGLRenderer,
): WebGLRenderTarget {
  const scene = new THREE.Scene();
  const shellGeo = new THREE.SphereGeometry(8, 20, 14);
  const shellMat = new THREE.MeshBasicMaterial({ color: 0x07060c, side: THREE.BackSide });
  scene.add(new THREE.Mesh(shellGeo, shellMat));

  const blobGeo = new THREE.SphereGeometry(1, 14, 10);
  const blob = (color: number, x: number, y: number, z: number, s: number): void => {
    const mesh = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ color }));
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(s);
    scene.add(mesh);
  };
  blob(0xff6ad5, 4.6, 1.4, 4.2, 1.7);
  blob(0x8e00ff, -5.1, 0.6, -3.4, 2.05);
  blob(0xffd166, 0.2, 6.4, 0.5, 1.15);
  blob(0x241028, -0.6, -2.2, 4.8, 2.2);

  const { PMREMGenerator } = THREE;
  const pmrem = new PMREMGenerator(renderer);
  // 0.09 asks PMREM for more blur samples than it keeps and warns.
  // 0.03 stays inside the 20-sample cap and still softens the blobs.
  const target = pmrem.fromScene(scene, 0.03);
  pmrem.dispose();
  shellGeo.dispose();
  blobGeo.dispose();
  scene.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.isMesh) (mesh.material as Material).dispose();
  });
  return target;
}

function makeGlowTexture(THREE: typeof import('three')): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const data = new Uint8Array([255, 106, 213, 80]);
    const tex = new THREE.DataTexture(data, 1, 1);
    tex.needsUpdate = true;
    return tex;
  }
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, 'rgba(255, 106, 213, 0.55)');
  g.addColorStop(0.32, 'rgba(142, 0, 255, 0.22)');
  g.addColorStop(0.62, 'rgba(142, 0, 255, 0.07)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function warmShaders(renderer: WebGLRenderer, slots: Slot[]): void {
  renderer.setScissorTest(true);
  for (const slot of slots) {
    renderer.setViewport(0, 0, 4, 4);
    renderer.setScissor(0, 0, 4, 4);
    renderer.clear(true, true, true);
    renderer.render(slot.scene, slot.camera);
  }
  renderer.setScissorTest(false);
}

function disposeGpu(
  renderer: WebGLRenderer,
  envTarget: WebGLRenderTarget,
  glow: Texture,
  slots: Slot[],
  layer: HTMLElement,
): void {
  if (layer.dataset.disposed === '1') return;
  layer.dataset.disposed = '1';
  // Pull blooms back into their frames before the layer is removed,
  // or the fallback still loses the halo that sits behind it.
  for (const slot of slots) {
    slot.frame.classList.remove('is-webgl');
    restoreBloom(slot);
  }
  const seen = new Set<BufferGeometry | Material | Texture>();
  const dumpMat = (mat: Material): void => {
    if (seen.has(mat)) return;
    seen.add(mat);
    const bag = mat as unknown as Record<string, unknown>;
    for (const key of Object.keys(bag)) {
      const value = bag[key];
      if (value && typeof value === 'object' && (value as Texture).isTexture) {
        const tex = value as Texture;
        if (tex !== glow && !seen.has(tex)) {
          seen.add(tex);
          tex.dispose();
        }
      }
    }
    mat.dispose();
  };
  for (const slot of slots) {
    slot.scene.environment = null;
    slot.scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh && !(obj as { isSprite?: boolean }).isSprite) return;
      const geo = (mesh as Mesh).geometry;
      if (geo && !seen.has(geo)) {
        seen.add(geo);
        geo.dispose();
      }
      const mats = mesh.material;
      if (!mats) return;
      const list = Array.isArray(mats) ? mats : [mats];
      for (const mat of list) dumpMat(mat);
    });
  }
  if (!seen.has(glow)) glow.dispose();
  envTarget.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  layer.remove();
}
