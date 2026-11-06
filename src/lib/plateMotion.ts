/**
 * SEO Imagine plates — pause ken-burns / glow / video when off-screen.
 * CSS owns still-plate loops; this toggles `.is-inview`, plays/pauses
 * `<video data-svp-plate-video>`, and respects prefers-reduced-motion
 * plus the site-wide `html.motion-off` toggle.
 */
import { motionEffectsDisabled, prefersReducedMotion } from '@lib/devicePolicy';

function motionOff(): boolean {
  return prefersReducedMotion() || motionEffectsDisabled();
}

function syncMotionFlag(): void {
  const off = motionOff();
  document.documentElement.classList.toggle('svp-plates-static', off);
  if (off) {
    document.querySelectorAll<HTMLVideoElement>('[data-svp-plate-video]').forEach((v) => {
      try { v.pause(); } catch { /* ignore */ }
    });
  }
}

function playSafe(v: HTMLVideoElement): void {
  const p = v.play();
  if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay blocked */ });
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

  const applyVisibility = (el: Element, visible: boolean) => {
    el.classList.toggle('is-inview', visible);
    const vid = el.querySelector<HTMLVideoElement>('[data-svp-plate-video]');
    if (!vid) return;
    if (motionOff() || !visible) {
      try { vid.pause(); } catch { /* ignore */ }
      return;
    }
    playSafe(vid);
  };

  if (!('IntersectionObserver' in window)) {
    stages.forEach((el) => applyVisibility(el, true));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        applyVisibility(entry.target, entry.isIntersecting);
      }
    },
    { rootMargin: '12% 0px', threshold: 0.08 }
  );
  stages.forEach((el) => io.observe(el));
}
