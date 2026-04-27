/**
 * Shared client-side performance policy for decorative effects.
 *
 * Phone-class touch devices are the crash-prone path: iOS Safari can
 * terminate tabs when several videos and WebGL contexts compete for GPU
 * memory. Use this helper before dynamic imports so disabled effects do
 * not even download/parse Three.js on phones.
 */
export function isPhoneClassTouch(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    window.matchMedia('(max-width: 900px)').matches
  );
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function motionEffectsDisabled(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('motion-off');
}

export function shouldSkipHeavyVisuals(): boolean {
  return isPhoneClassTouch() || prefersReducedMotion() || motionEffectsDisabled();
}
