/**
 * SEO Imagine plates — pause ken-burns / glow when off-screen.
 * CSS owns the loop; this only toggles `.is-inview` + respects
 * prefers-reduced-motion and the site-wide `html.motion-off` toggle.
 */
import { motionEffectsDisabled, prefersReducedMotion } from '@lib/devicePolicy';

function syncMotionFlag(): void {
  const off = prefersReducedMotion() || motionEffectsDisabled();
  document.documentElement.classList.toggle('svp-plates-static', off);
}

export function initPlateMotion(): void {
  const stages = document.querySelectorAll<HTMLElement>('[data-svp-plate]');
  if (!stages.length) return;

  syncMotionFlag();

  const mo = new MutationObserver(syncMotionFlag);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  try {
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', syncMotionFlag);
  } catch { /* older Safari */ }

  if (!('IntersectionObserver' in window)) {
    stages.forEach((el) => el.classList.add('is-inview'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-inview', entry.isIntersecting);
      }
    },
    { rootMargin: '12% 0px', threshold: 0.08 }
  );
  stages.forEach((el) => io.observe(el));
}
