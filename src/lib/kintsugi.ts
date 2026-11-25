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

import { initMagneticField, type MagneticFieldHandle } from './magneticField';
import { playGlassTick } from './audioNote';

interface KinItem {
  x: number;
  y: number;
  my: number;
  anchor: 'left' | 'right' | 'center';
  text: string;
  href: string;
  ext?: boolean;
}

// Asymmetric radial coordinates on desktop (x, y) plus safe-area vertical
// slots (my) + horizontal edge anchors on <=720px phones so zero labels
// ever clip off-screen or collide with the central 侍 glyph or close button.
const LABELS: KinItem[] = [
  { x: 50, y: 10, my: 11, anchor: 'center', text: 'SERVICES',    href: '/services/' },
  { x: 16, y: 22, my: 23, anchor: 'left',   text: 'DOCTRINE',    href: '/#doctrine' },
  { x: 82, y: 20, my: 23, anchor: 'right',  text: 'HOME',        href: '/' },
  { x: 12, y: 48, my: 35, anchor: 'left',   text: 'WHY',         href: '/#why' },
  { x: 88, y: 46, my: 35, anchor: 'right',  text: 'WORK',        href: '/work/' },
  { x: 16, y: 76, my: 66, anchor: 'left',   text: 'PROCESS',     href: '/process/' },
  { x: 86, y: 74, my: 66, anchor: 'right',  text: 'START ↳',     href: '/start/' },
  { x: 30, y: 90, my: 79, anchor: 'left',   text: 'BUILD NOTES', href: '/build-notes/' },
  { x: 70, y: 90, my: 79, anchor: 'right',  text: 'BOOK CALL ↳', href: 'https://calendly.com/kr8tiv', ext: true }
];

export function initKintsugi(): void {
  const overlay = document.getElementById('kintsugi-overlay') as HTMLElement | null;
  if (!overlay) return;
  const svg = overlay.querySelector<SVGSVGElement>('svg.kin-cracks');
  const closeBtn = overlay.querySelector<HTMLButtonElement>('.kin-close');
  if (!svg) return;

  LABELS.forEach((l) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kin-label-html';
    btn.dataset.href = l.href;
    btn.dataset.anchor = l.anchor;
    if (l.ext) btn.dataset.ext = 'true';
    btn.style.setProperty('--lx', l.x + '%');
    btn.style.setProperty('--ly', l.y + '%');
    btn.style.setProperty('--mly', l.my + '%');
    const rightSide = l.anchor === 'right';
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
      playGlassTick(1174.66);
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
    playGlassTick(880);
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
