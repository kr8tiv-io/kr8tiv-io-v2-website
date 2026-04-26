/**
 * Three.js liquid-glass hero overlay.
 *
 * A transparent full-screen plane rendered with MeshPhysicalMaterial
 * at transmission=1, thickness + ior tuned for a subtle refractive
 * distortion over the hero video. Cheap — one plane, no expensive
 * cube map, relies on default environment.
 *
 * Gated behind IntersectionObserver + prefers-reduced-motion so it
 * only boots on capable devices when the hero is actually in view.
 */
import * as THREE from 'three';

interface GlassInstance {
  dispose: () => void;
}

export function initLiquidGlass(canvasSelector = '#prism-webgl'): GlassInstance | null {
  const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector);
  if (!canvas) return null;

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const setSize = (): void => {
    const w = window.innerWidth;
    const h = Math.max(window.innerHeight, 600);
    renderer.setSize(w, h, false);
  };
  setSize();

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // Subtle pinkish-purple tinted plane with high transmission so it
  // acts as a thin refractive sheet over whatever's behind.
  const geo = new THREE.PlaneGeometry(2.2, 2.2, 48, 48);
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xffffff),
    transmission: 1.0,
    thickness: 0.6,
    ior: 1.45,
    roughness: 0.06,
    metalness: 0.0,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  const light = new THREE.DirectionalLight(0xff6ad5, 0.8);
  light.position.set(1, 0.6, 1);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0x8e00ff, 0.4);
  rim.position.set(-0.8, -0.5, 1);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  let mouseX = 0, mouseY = 0;
  const onMove = (e: PointerEvent): void => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointermove', onMove);

  let running = true;
  let raf = 0;
  function tick(t: number): void {
    if (!running) return;
    // Subtle vertex displacement via sine wave for that "liquid" quality.
    const positions = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = Math.sin(x * 3 + t * 0.0009) * 0.02 + Math.cos(y * 2.6 + t * 0.0012) * 0.02;
      positions.setZ(i, z);
    }
    positions.needsUpdate = true;
    // Mesh very slightly tracks cursor.
    mesh.rotation.x = mouseY * 0.08;
    mesh.rotation.y = mouseX * 0.08;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  const onResize = (): void => setSize();
  window.addEventListener('resize', onResize);

  // Only run while the hero is near the viewport — saves GPU when the
  // user has scrolled deep into the services/work sections.
  const hero = document.querySelector('.hero');
  if (hero) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        running = entry.isIntersecting;
        if (running && !raf) raf = requestAnimationFrame(tick);
      }
    }, { threshold: 0.05 });
    io.observe(hero);
  }

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    }
  };
}
