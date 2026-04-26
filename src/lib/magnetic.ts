/**
 * Magnetic cursor attraction on CTA elements.
 *
 * Uses gsap.quickTo to pre-compile the x/y setters — zero allocations
 * per pointermove. Element pulls toward cursor when within RADIUS,
 * springs back on leave.
 */
import { gsap } from 'gsap';

const RADIUS = 80;
const STRENGTH = 0.35;

export function initMagnetic(selector: string): void {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll<HTMLElement>(selector);
  targets.forEach((el) => {
    const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      if (Math.hypot(dx, dy) < RADIUS) {
        qx(dx * STRENGTH);
        qy(dy * STRENGTH);
      }
    });
    el.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
}
