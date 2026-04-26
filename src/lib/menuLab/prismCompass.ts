/**
 * Menu Lab · Concept 04 — Prism Compass.
 *
 * A rotating glass dodecahedron. Each of the 12 faces represents a
 * potential nav target; hovering a face highlights it and names it
 * below. Mouse drag rotates with spring-back. A subtle environment
 * light with Fresnel makes it read as "stained glass."
 */
import * as THREE from 'three';

const FACE_NAMES = [
  'Doctrine', 'Index', 'Why', 'Work', 'Process', 'Start',
  'Book call', 'Notes', 'Manifesto', 'Archive', 'Companions', 'Login'
];

export function initPrismCompass(selector = '.ml-compass'): void {
  const host = document.querySelector<HTMLElement>(selector);
  if (!host) return;
  const targetEl = host.querySelector<HTMLElement>('.target');

  const canvas = document.createElement('canvas');
  host.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  const size = () => ({ w: host.clientWidth, h: 480 });
  renderer.setSize(size().w, size().h, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, size().w / size().h, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Main dodecahedron — faceted so each pentagonal face is flat
  const geometry = new THREE.DodecahedronGeometry(1.8, 0);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x111120,
    metalness: 0.1,
    roughness: 0.25,
    transmission: 0.6,
    thickness: 0.8,
    ior: 1.45,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Wireframe overlay so you can *see* the facets even when the
  // transmission material is subtle.
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xff6ad5, transparent: true, opacity: 0.55 })
  );
  mesh.add(wire);

  // Rim accent — a second larger wireframe at lower opacity for depth
  const halo = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.DodecahedronGeometry(1.85, 0)),
    new THREE.LineBasicMaterial({ color: 0x8e00ff, transparent: true, opacity: 0.28 })
  );
  scene.add(halo);

  // Soft glowing points at each vertex — look like refraction nodes
  const vertexPoints = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xffd166, size: 0.06, transparent: true, opacity: 0.8, sizeAttenuation: true })
  );
  mesh.add(vertexPoints);

  // Lights
  const key = new THREE.DirectionalLight(0xff6ad5, 2);
  key.position.set(4, 3, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8e00ff, 1.4);
  fill.position.set(-4, -2, 3);
  scene.add(fill);
  const rim = new THREE.PointLight(0xffd166, 1.6, 10);
  rim.position.set(0, 0, -4);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x1a1a2e, 1.2));

  // ── Interaction: drag-to-rotate with spring-back ──
  const rot = { x: 0.2, y: 0.4 };
  const target = { x: 0.2, y: 0.4 };
  const momentum = { x: 0, y: 0 };
  let dragging = false;
  let last = { x: 0, y: 0 };

  host.addEventListener('pointerdown', (e) => {
    dragging = true;
    last.x = e.clientX;
    last.y = e.clientY;
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    last.x = e.clientX;
    last.y = e.clientY;
    target.y += dx * 0.008;
    target.x += dy * 0.008;
    momentum.y = dx * 0.008;
    momentum.x = dy * 0.008;
  });
  host.addEventListener('pointerup', (e) => {
    dragging = false;
    host.releasePointerCapture(e.pointerId);
  });
  host.addEventListener('pointerleave', () => { dragging = false; });

  // ── Hover + click: ray-test a face ──
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let lastFaceIdx = -1;
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(mesh);
    if (hits.length > 0 && hits[0]) {
      // Each dodecahedron face = 3 triangles in THREE's tesselation
      const faceIdx = Math.floor(hits[0].faceIndex! / 3) % FACE_NAMES.length;
      if (faceIdx !== lastFaceIdx) {
        lastFaceIdx = faceIdx;
        host.dataset.active = 'true';
        if (targetEl) targetEl.textContent = FACE_NAMES[faceIdx]!;
      }
    } else {
      lastFaceIdx = -1;
      host.dataset.active = 'false';
    }
  });
  host.addEventListener('pointerleave', () => {
    lastFaceIdx = -1;
    host.dataset.active = 'false';
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
      // Idle auto-rotation if not dragging
      if (!dragging) {
        target.y += 0.002;
        rot.x += momentum.x;
        rot.y += momentum.y;
        momentum.x *= 0.92;
        momentum.y *= 0.92;
      }
      rot.x += (target.x - rot.x) * 0.12;
      rot.y += (target.y - rot.y) * 0.12;
      mesh.rotation.x = rot.x;
      mesh.rotation.y = rot.y;
      halo.rotation.x = rot.x * 0.96;
      halo.rotation.y = rot.y * 0.96;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
