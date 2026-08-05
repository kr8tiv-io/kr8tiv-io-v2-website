/**
 * cardTilt — pointer-tracked 3D tilt + specular sheen for .work-card.
 *
 * Writes four custom properties consumed by elevate.css:
 *   --rx / --ry  perspective tilt (max ±3.5deg — plinth, not gimmick)
 *   --mx / --my  specular highlight position
 *   --sheen      0..1 highlight strength (eased in/out on enter/leave)
 *
 * Desktop-only by design: bails on coarse pointers, reduced motion,
 * and the site's own motion toggle. rAF-coalesced so a fast pointer
 * costs one style write per frame, not one per event.
 */

const MAX_TILT = 3.5;

export function initCardTilt(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.classList.contains('motion-off')) return;

  const cards = document.querySelectorAll<HTMLElement>('.work-card');
  if (!cards.length) return;

  cards.forEach((card) => {
    let raf = 0;
    let px = 0.5;
    let py = 0.5;
    let inside = false;

    const paint = (): void => {
      raf = 0;
      const rx = ((py - 0.5) * -2 * MAX_TILT).toFixed(2);
      const ry = ((px - 0.5) * 2 * MAX_TILT).toFixed(2);
      card.style.setProperty('--rx', inside ? `${rx}deg` : '0deg');
      card.style.setProperty('--ry', inside ? `${ry}deg` : '0deg');
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      card.style.setProperty('--sheen', inside ? '1' : '0');
    };
    const queue = (): void => { if (!raf) raf = requestAnimationFrame(paint); };

    card.addEventListener('pointerenter', () => { inside = true; queue(); }, { passive: true });
    card.addEventListener('pointermove', (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      queue();
    }, { passive: true });
    card.addEventListener('pointerleave', () => { inside = false; queue(); }, { passive: true });
  });
}
