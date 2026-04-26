/**
 * Menu Lab · Concept 07 — The Obelisk.
 *
 * A 4-sided monolith with a prism glass material. It rises from
 * below on trigger, each face labeled with a section name. Drag to
 * orbit. Hover a face to highlight + name it. Click sends a nav
 * intent event the host page can subscribe to.
 */
import * as THREE from 'three';

const FACES = ['Work', 'Process', 'Start', 'About'];

export function initObelisk(selector = '.ml-obelisk'): void {
  const host = document.querySelector<HTMLElement>(selector);
  if (!host) return;
  const trigger = host.querySelector<HTMLElement>('.obe-trigger');
  const labelEl = host.querySelector<HTMLElement>('.obe-face-label');

  const canvas = document.createElement('canvas');
  host.insertBefore(canvas, host.firstChild);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  const size = () => ({ w: host.clientWidth, h: 520 });
  renderer.setSize(size().w, size().h, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, size().w / size().h, 0.1, 100);
  camera.position.set(0, 0, 9);

  // Slightly tapered box for an obelisk silhouette: widen the base,
  // narrow the top. BoxGeometry modified per-vertex.
  const geom = new THREE.BoxGeometry(1.6, 5.2, 1.6, 2, 6, 2);
  const pos = geom.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // Taper: at top (+y) scale xz to 0.45, at bottom (-y) scale to 1.2
    const t = (y + 2.6) / 5.2; // 0..1
    const taper = 1.2 - t * 0.75;
    pos.setX(i, pos.getX(i) * taper);
    pos.setZ(i, pos.getZ(i) * taper);
  }
  geom.computeVertexNormals();

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a18,
    metalness: 0.3,
    roughness: 0.15,
    transmission: 0.5,
    thickness: 1.4,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.12
  });
  const monolith = new THREE.Mesh(geom, material);
  monolith.position.y = -6;
  scene.add(monolith);

  // Wireframe edges
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geom),
    new THREE.LineBasicMaterial({ color: 0xff6ad5, transparent: true, opacity: 0.6 })
  );
  monolith.add(edges);

  // Base glow — a flat disc under the obelisk
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 48),
    new THREE.MeshBasicMaterial({
      color: 0xff6ad5,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -2.7;
  scene.add(disc);

  // Lights
  const key = new THREE.DirectionalLight(0xff6ad5, 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8e00ff, 1.2);
  fill.position.set(-3, 2, 3);
  scene.add(fill);
  const under = new THREE.PointLight(0xffd166, 2, 6);
  under.position.set(0, -2.5, 0);
  scene.add(under);
  scene.add(new THREE.AmbientLight(0x111120, 1));

  // ── Rise / fall state ──
  let risen = false;
  const toggleRise = (): void => {
    risen = !risen;
    if (trigger) trigger.textContent = risen ? 'Lower the obelisk ↓' : 'Summon the obelisk ↑';
  };
  trigger?.addEventListener('click', toggleRise);
  toggleRise(); // start raised for immediate visual

  // ── Drag to orbit ──
  const rot = { y: 0 };
  const target = { y: 0 };
  let dragging = false;
  let lastX = 0;
  let momentum = 0;
  host.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('.obe-trigger')) return;
    dragging = true;
    lastX = e.clientX;
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    target.y += dx * 0.008;
    momentum = dx * 0.008;
  });
  host.addEventListener('pointerup', (e) => {
    dragging = false;
    try { host.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  });
  host.addEventListener('pointerleave', () => { dragging = false; });

  // ── Hover detection: which of the 4 faces is front-most? ──
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(monolith);
    if (hits.length > 0 && risen) {
      // World-space normal → rotate back to local, pick face
      const n = hits[0]!.face!.normal.clone();
      n.transformDirection(monolith.matrixWorld);
      // Face by dominant axis component
      const absX = Math.abs(n.x), absZ = Math.abs(n.z);
      let faceIdx: number;
      if (absX > absZ) faceIdx = n.x > 0 ? 0 : 2;
      else faceIdx = n.z > 0 ? 1 : 3;
      host.dataset.faceHover = 'true';
      if (labelEl) labelEl.textContent = FACES[faceIdx] ?? '';
    } else {
      host.dataset.faceHover = 'false';
    }
  });

  // ── Resize ──
  const ro = new ResizeObserver(() => {
    const { w, h } = size();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  ro.observe(host);

  // ── Render loop ──
  let visible = true;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { visible = e.isIntersecting; });
  });
  io.observe(host);

  function tick(): void {
    if (visible) {
      // Rise / fall lerp
      const targetY = risen ? 0 : -6;
      monolith.position.y += (targetY - monolith.position.y) * 0.06;
      disc.material.opacity = Math.max(0, monolith.position.y + 2.7) > 0.5
        ? 0.15
        : 0.02;

      // Rotation inertia
      if (!dragging) {
        target.y += momentum;
        momentum *= 0.92;
        target.y += 0.004; // gentle auto-rotate
      }
      rot.y += (target.y - rot.y) * 0.14;
      monolith.rotation.y = rot.y;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
