/**
 * Kintsugi — full-viewport menu overlay (Hybrid · layer 3/3).
 *
 * Originally rendered as gold-filled crack paths. Per a brand
 * direction tweak, the cracked-line aesthetic was replaced with a
 * magnetic particle field colored to match the 侍 kanji
 * (`--accent-1` magenta). The labels still sit at the same screen
 * positions for nav-muscle-memory continuity, but the lines that
 * previously connected them to the impact center are gone.
 *
 * The crack-path data (SPINES / BRANCHES / FEATHERS / IMPACT_MICRO /
 * SPARKLES) is intentionally retained below — keeps the file ready
 * to revive the kintsugi aesthetic on a different page or as a
 * future variant — but `initKintsugi()` no longer renders any of it.
 *
 * DOM contract: `#kintsugi-overlay` with `.kin-close`, the inner
 * `<svg.kin-cracks>` (now used only for label hit-targets and dots),
 * and `.kin-center` (the 侍 glyph + "pick a path" caption).
 */

// Destination labels positioned as percentages of the 100×100 SVG
// viewBox. Chosen so the fractures fan asymmetrically — not a
// compass rose. The `x` / `y` values hug the crack endpoints below.
const LABELS: Array<{ x: number; y: number; text: string; href: string; ext?: boolean }> = [
  { x: 82, y: 14, text: 'HOME',       href: '/' },
  { x: 90, y: 44, text: 'WORK',       href: '/#work' },
  { x: 88, y: 74, text: 'START ↳',    href: '/start/' },
  { x: 58, y: 92, text: 'BOOK CALL ↳', href: 'https://calendly.com/kr8tiv', ext: true },
  { x: 16, y: 84, text: 'PROCESS',    href: '/process/' },
  { x: 10, y: 52, text: 'WHY',        href: '/#why' },
  { x: 14, y: 22, text: 'DOCTRINE',   href: '/#doctrine' },
  { x: 48, y: 8,  text: 'BUILD NOTES', href: '/build-notes/' }
];

// Hand-authored crack paths. Three tiers of thickness/authority:
//   SPINES    — the 8 primary fractures radiating to each label
//   BRANCHES  — 16 secondary cracks peeling off the spines
//   FEATHERS  — 24 tertiary micro-fractures (texture only)
// Mix of L (straight) and Q (quadratic bezier) commands — real cracks
// in kintsugi-mended porcelain have both sharp angular pivots (stress
// fractures) and subtle curves (material flex). `M 50,50` is the
// impact center for all spines. Micro-cracks radiate from there.
const SPINES = [
  // to HOME (82,14) — diagonal up-right
  'M 50,50 Q 53,48 57,43 L 63,37 Q 66,34 71,28 L 76,23 Q 79,19 82,14',
  // to WORK (90,44) — near-horizontal right, tiny dip
  'M 50,50 L 56,49 Q 62,48 68,47 L 75,46 Q 82,45 86,44 L 90,44',
  // to START (88,74) — diagonal down-right
  'M 50,50 Q 54,55 58,59 L 64,63 Q 70,67 75,70 L 81,72 Q 85,73 88,74',
  // to BOOK CALL (58,92) — downward with slight right drift
  'M 50,50 Q 51,56 53,62 L 54,70 Q 55,77 56,84 L 57,89 L 58,92',
  // to PROCESS (16,84) — diagonal down-left
  'M 50,50 Q 46,55 42,59 L 36,65 Q 30,71 25,76 L 20,80 Q 18,82 16,84',
  // to WHY (10,52) — near-horizontal left with small rise
  'M 50,50 L 42,51 Q 34,52 26,52 L 18,52 Q 13,52 10,52',
  // to DOCTRINE (14,22) — diagonal up-left
  'M 50,50 Q 46,46 42,42 L 36,36 Q 30,30 24,26 L 18,23 L 14,22',
  // to BUILD NOTES (48,8) — near-vertical up, slight left
  'M 50,50 L 50,42 Q 50,34 49,26 L 49,18 Q 48,12 48,8'
];

// Secondary branches — peel off at organic angles, shorter, curved
const BRANCHES = [
  // branches off HOME spine
  'M 57,43 Q 60,40 63,37 L 66,36',
  'M 71,28 Q 75,26 79,26',
  'M 63,37 L 60,33 Q 57,31 55,29',
  // branches off WORK spine
  'M 68,47 Q 72,44 76,42 L 79,40',
  'M 62,48 Q 60,52 58,55',
  // branches off START spine
  'M 64,63 Q 66,67 68,71',
  'M 75,70 L 77,74 Q 78,77 79,79',
  // branches off BOOK-CALL spine
  'M 54,70 L 50,73 Q 47,75 45,77',
  'M 56,84 Q 52,85 48,86 L 45,87',
  // branches off PROCESS spine
  'M 36,65 L 32,62 Q 29,60 26,59',
  'M 25,76 Q 22,73 19,71 L 17,70',
  // branches off WHY spine
  'M 26,52 L 24,48 Q 22,45 20,44',
  'M 34,52 L 32,55 Q 30,58 28,60',
  // branches off DOCTRINE spine
  'M 36,36 L 34,32 Q 32,28 30,26',
  'M 24,26 Q 21,24 18,23 L 16,22',
  // branches off BUILD-NOTES spine
  'M 50,42 L 52,40 Q 54,38 55,36',
  'M 49,26 Q 46,24 43,23'
];

// Tertiary feathers — micro-detail, kept short, no curves (brittle stress lines)
const FEATHERS = [
  'M 60,40 L 62,39', 'M 66,36 L 67,34', 'M 71,32 L 72,30',
  'M 72,46 L 73,48', 'M 78,46 L 79,48', 'M 82,45 L 83,43',
  'M 66,61 L 68,60', 'M 72,66 L 73,68', 'M 78,71 L 79,72',
  'M 52,58 L 51,60', 'M 53,66 L 54,68', 'M 54,72 L 53,74',
  'M 42,59 L 41,61', 'M 34,66 L 33,68', 'M 28,73 L 27,74',
  'M 40,51 L 41,53', 'M 30,52 L 29,54', 'M 22,52 L 21,54',
  'M 42,42 L 40,40', 'M 34,34 L 33,32', 'M 26,27 L 25,26',
  'M 50,42 L 51,40', 'M 49,32 L 50,30', 'M 48,18 L 49,16'
];

// Tiny radial micro-cracks right at the impact center (visual weight
// at the "hit point", where the pottery was struck).
const IMPACT_MICRO = [
  'M 50,50 L 52,48', 'M 50,50 L 48,48', 'M 50,50 L 52,52',
  'M 50,50 L 48,52', 'M 50,50 L 51,47', 'M 50,50 L 49,47',
  'M 50,50 L 53,51', 'M 50,50 L 47,51'
];

// Sparkle points — drawn as tiny gold circles with a pulsing glow.
// Placed at the impact center + a handful of major crack intersections
// for that kintsugi "repaired with gold dust" shimmer.
const SPARKLES: Array<{ x: number; y: number; r: number; delay: number }> = [
  { x: 50,   y: 50,   r: 0.55, delay: 0   },     // impact center, biggest
  { x: 57,   y: 43,   r: 0.32, delay: 0.4 },
  { x: 68,   y: 47,   r: 0.28, delay: 0.8 },
  { x: 64,   y: 63,   r: 0.30, delay: 1.2 },
  { x: 54,   y: 70,   r: 0.25, delay: 1.6 },
  { x: 36,   y: 65,   r: 0.32, delay: 0.3 },
  { x: 26,   y: 52,   r: 0.28, delay: 0.7 },
  { x: 36,   y: 36,   r: 0.30, delay: 1.1 },
  { x: 50,   y: 42,   r: 0.25, delay: 1.5 },
  { x: 63,   y: 37,   r: 0.22, delay: 0.6 },
  { x: 42,   y: 42,   r: 0.22, delay: 1.0 },
  { x: 55,   y: 29,   r: 0.20, delay: 1.4 }
];

/* Suppress "declared but never read" hints — these crack-data
   constants are intentionally retained for a future revival of the
   kintsugi aesthetic. Single statement keeps the void at module
   scope without affecting runtime. SVG_NS dropped along with the
   crack rendering — labels are HTML now, not SVG <text>. */
void SPINES; void BRANCHES; void FEATHERS; void IMPACT_MICRO; void SPARKLES;

import { initMagneticField, type MagneticFieldHandle } from './magneticField';

export function initKintsugi(): void {
  const overlay = document.getElementById('kintsugi-overlay') as HTMLElement | null;
  if (!overlay) return;
  const svg = overlay.querySelector<SVGSVGElement>('svg.kin-cracks');
  const closeBtn = overlay.querySelector<HTMLButtonElement>('.kin-close');
  if (!svg) return;

  /* All crack-related rendering (defs/halo/spines/branches/feathers/
     pulses/shockwaves/debris/sparkles) intentionally retired. The
     overlay now ships a magnetic particle field as the background;
     the SVG carries only label hit-targets + dots. */

  /* No spine layers tracked any more — surge hover effects are
     retired with the cracks. Keep the empty array so the label
     hover handlers below remain harmless no-ops if revived. */
  const spineLayers: SVGPathElement[][] = [];

  /* HTML labels — replaces the previous SVG <text> rendering. The
     SVG was sized with `preserveAspectRatio="none"` so its <text>
     got stretched horizontally to fill the viewport, breaking
     letter-spacing and weight relative to the rest of the site.
     HTML buttons positioned via percentage coords inherit standard
     CSS typography (JetBrains Mono · uppercase · proper tracking). */
  void spineLayers;
  LABELS.forEach((l) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kin-label-html';
    btn.dataset.href = l.href;
    if (l.ext) btn.dataset.ext = 'true';
    btn.style.setProperty('--lx', l.x + '%');
    btn.style.setProperty('--ly', l.y + '%');
    /* Right-side labels read right-to-left; left-side labels left-
       to-right. The dot-then-text vs text-then-dot order flips so
       the dot always sits on the inside of the screen-edge. */
    const rightSide = l.x > 50;
    btn.dataset.side = rightSide ? 'right' : 'left';

    const dotEl = document.createElement('span');
    dotEl.className = 'kin-label-dot';
    dotEl.setAttribute('aria-hidden', 'true');

    const textEl = document.createElement('span');
    textEl.className = 'kin-label-text';
    textEl.textContent = l.text;

    if (rightSide) {
      btn.appendChild(textEl);
      btn.appendChild(dotEl);
    } else {
      btn.appendChild(dotEl);
      btn.appendChild(textEl);
    }
    btn.setAttribute('aria-label', l.text);

    btn.addEventListener('click', () => {
      if (l.ext) window.open(l.href, '_blank', 'noopener,noreferrer');
      else location.href = l.href;
      setTimeout(close, 200);
    });

    overlay.appendChild(btn);
  });

  /* Magnetic field handle — created on open, disposed on close so
     the rAF loop doesn't run when the overlay is hidden. Color is
     resolved from --accent-1 at open-time so theme switches between
     opens are picked up. */
  let mag: MagneticFieldHandle | null = null;
  const resolveAccent1RGB = (): [number, number, number] => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-1').trim();
    /* Match common CSS hex / rgb formats. Fallback to magenta. */
    const hex = /^#([0-9a-f]{3,8})$/i.exec(raw);
    if (hex) {
      const h = hex[1] ?? '';
      const expand = h.length === 3
        ? h.split('').map((c) => c + c).join('')
        : (h.length >= 6 ? h.slice(0, 6) : '');
      if (expand.length === 6) {
        const r = parseInt(expand.slice(0, 2), 16);
        const g = parseInt(expand.slice(2, 4), 16);
        const b = parseInt(expand.slice(4, 6), 16);
        return [r, g, b];
      }
    }
    const rgb = /rgb[a]?\((\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(raw);
    if (rgb) {
      return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    }
    return [255, 106, 213];
  };

  const open = (): void => {
    // Close Oracle if open — one overlay at a time
    window.dispatchEvent(new CustomEvent('oracle:close'));
    overlay.dataset.open = 'true';
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('kintsugi-open');
    // Focus the close button so Esc + Tab navigation is intuitive
    setTimeout(() => closeBtn?.focus(), 80);

    /* Light it up — kanji-coloured magnetic particles. Light theme
       runs over a cream background so we use a cream trail bg so the
       fade math doesn't render dark smear on light paper.
       Particle count bumped to 520 (double the v9 original at 240)
       for the dense field the user wanted; perf still holds because
       Canvas2D + ~270k distance checks per frame is well within
       modern browser headroom. */
    if (!mag) {
      const isLight = document.documentElement.dataset.theme === 'light';
      mag = initMagneticField(overlay, {
        color: resolveAccent1RGB(),
        trailBg: isLight ? '245,242,234' : '5,5,7',
        count: 520,
      });
    }
  };
  const close = (): void => {
    overlay.dataset.open = 'false';
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('kintsugi-open');
    if (mag) {
      mag.dispose();
      mag = null;
    }
  };

  // External triggers
  window.addEventListener('kintsugi:open', open);
  window.addEventListener('kintsugi:close', close);
  document.querySelectorAll<HTMLElement>('[data-kintsugi-trigger]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      overlay.dataset.open === 'true' ? close() : open();
    });
  });

  closeBtn?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.dataset.open === 'true') close();
  });
  // Clicking the overlay background (not a label) closes
  overlay.addEventListener('click', (e) => {
    const hitLabel = (e.target as Element).closest?.('.kin-label-group');
    if (!hitLabel && e.target === overlay) close();
  });

  // Initial state: closed
  close();
}
