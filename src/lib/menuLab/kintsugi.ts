/**
 * Menu Lab · Concept 06 — Kintsugi Cracks.
 *
 * Clicking the trigger fractures the viewport along SVG path cracks
 * filled with gold. Each crack segment is an invisible hit target
 * labeled with a nav destination. Drawing is stroke-dasharray
 * animated via CSS; this module just swaps state and wires hit
 * targets.
 *
 * The crack paths are authored by hand so they feel organic rather
 * than geometric. Each path is paired with a label element that
 * fades in along the animation's tail.
 */

const LABELS = [
  { x: 34, y: 16, text: 'DOCTRINE' },
  { x: 74, y: 28, text: 'WORK' },
  { x: 18, y: 54, text: 'PROCESS' },
  { x: 62, y: 62, text: 'AI SYSTEMS' },
  { x: 42, y: 86, text: 'BOOK CALL ↳' }
];

const CRACKS = [
  'M 50,50 L 60,42 L 74,28 L 86,20 L 96,12',
  'M 50,50 L 40,56 L 30,60 L 20,64 L 12,72',
  'M 50,50 L 44,62 L 38,72 L 42,82 L 48,94',
  'M 50,50 L 58,60 L 66,68 L 72,78 L 80,90',
  'M 50,50 L 58,38 L 66,28 L 72,18 L 78,10',
  'M 50,50 L 42,40 L 34,30 L 26,20 L 18,10',
  // Branches
  'M 60,42 L 68,36 L 74,42',
  'M 40,56 L 32,54 L 26,58',
  'M 58,60 L 64,68 L 62,74'
];

export function initKintsugi(selector = '.ml-kintsugi'): void {
  const host = document.querySelector<HTMLElement>(selector);
  if (!host) return;
  const trigger = host.querySelector<HTMLButtonElement>('.kin-trigger');
  const svg = host.querySelector<SVGElement>('svg.kin-cracks');
  if (!svg) return;

  // Construct all paths + labels programmatically; keeps markup clean.
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  CRACKS.forEach((d) => {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    p.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(p);
  });
  LABELS.forEach((l) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // Wider invisible hit target
    const hot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hot.setAttribute('cx', String(l.x));
    hot.setAttribute('cy', String(l.y));
    hot.setAttribute('r', '4');
    hot.setAttribute('class', 'kin-hot');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(l.x));
    text.setAttribute('y', String(l.y - 2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'kin-label');
    text.textContent = l.text;
    g.appendChild(hot);
    g.appendChild(text);
    svg.appendChild(g);
  });

  trigger?.addEventListener('click', () => {
    const cracked = host.dataset.cracked === 'true';
    host.dataset.cracked = cracked ? 'false' : 'true';
    if (trigger) trigger.textContent = cracked ? '✱ shatter the page' : '✱ repair';
  });

  // Start cracked so the demo is immediately visible; user can toggle.
  host.dataset.cracked = 'true';
  if (trigger) trigger.textContent = '✱ repair';
}
