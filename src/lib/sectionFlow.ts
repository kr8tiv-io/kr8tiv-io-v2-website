/**
 * Section flow — the one piece of script behind the blending system.
 *
 * All it does is write a single custom property, `--flow-y` (0..1), onto
 * the fixed `.flow-field` layer once per animation frame. blend.css
 * composes that number into the positions of three very large, very soft
 * radial blooms, so the page's atmosphere drifts continuously as you
 * scroll and chapters dissolve through it rather than butting together.
 *
 * Why it is written this way:
 *
 *  · ONE PROPERTY, ONE ELEMENT. Every alternative — animating each
 *    section, per-section ScrollTriggers, a canvas — costs work
 *    proportional to the number of sections. This costs one style write
 *    per frame regardless of how long the page gets.
 *
 *  · NO LAYOUT, NO PAINT OF CONTENT. The field is `position: fixed` and
 *    only its gradient positions change, so the compositor repaints one
 *    layer that contains no text and no images.
 *
 *  · rAF-COALESCED. Scroll events can fire several times per frame.
 *    Writing on every one of them is wasted work and, worse, can force a
 *    style recalc mid-frame. We record the target on scroll and write at
 *    most once per frame.
 *
 *  · EASED, NOT SNAPPED. The raw scroll ratio is lerped toward its
 *    target, so a fast flick makes the light sweep rather than jump. The
 *    loop parks itself the moment the delta is imperceptible, so an idle
 *    page costs nothing at all.
 *
 * Honours the site's visible motion toggle and prefers-reduced-motion:
 * in both cases the field holds still at mid-drift. The blending itself
 * is design, not motion, so it stays — only the movement stops.
 */
import { prefersReducedMotion, motionEffectsDisabled } from '@lib/devicePolicy';

const EPS = 0.0004;

export function initSectionFlow(): void {
  const field = document.querySelector<HTMLElement>('.flow-field');
  if (!field) return;

  const still = (): boolean => prefersReducedMotion() || motionEffectsDisabled();

  if (still()) {
    field.style.setProperty('--flow-y', '0.5');
    watchMotionToggle(field);
    return;
  }

  let target = 0;
  let current = 0;
  let raf = 0;
  let lastWritten = -1;

  const readTarget = (): void => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };

  const tick = (): void => {
    // Ease toward the scroll position. 0.08 is slow enough that the
    // blooms feel like weather rather than a readout of the scrollbar.
    current += (target - current) * 0.08;
    const v = Math.round(current * 1000) / 1000;
    // Only touch the DOM when the value actually changed at the
    // precision the gradients can express — sub-0.001 writes are style
    // recalcs nobody can see.
    if (v !== lastWritten) {
      field.style.setProperty('--flow-y', String(v));
      lastWritten = v;
    }
    if (Math.abs(target - current) > EPS) {
      raf = requestAnimationFrame(tick);
    } else {
      current = target;
      raf = 0;
    }
  };

  const kick = (): void => { if (!raf) raf = requestAnimationFrame(tick); };

  const onScroll = (): void => {
    if (still()) return;
    readTarget();
    kick();
  };

  readTarget();
  current = target;
  field.style.setProperty('--flow-y', String(Math.round(current * 1000) / 1000));

  window.addEventListener('scroll', onScroll, { passive: true });
  // Resize changes the denominator; re-derive rather than drift.
  window.addEventListener('resize', () => { readTarget(); kick(); }, { passive: true });

  watchMotionToggle(field, () => {
    if (still()) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      field.style.setProperty('--flow-y', '0.5');
    } else {
      lastWritten = -1;
      readTarget();
      kick();
    }
  });
}

/** The motion toggle flips a class on <html>; mirror it live. */
function watchMotionToggle(field: HTMLElement, onChange?: () => void): void {
  new MutationObserver(() => {
    if (onChange) onChange();
    else if (prefersReducedMotion() || motionEffectsDisabled()) {
      field.style.setProperty('--flow-y', '0.5');
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
