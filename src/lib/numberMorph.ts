/**
 * Scroll-driven type morph on the giant italic step numbers.
 *
 * Instrument Serif doesn't ship a variable-weight axis, so "type
 * weight" here is faked via the visual levers the font DOES respond
 * to: font-size, letter-spacing, text-shadow glow, and CSS
 * `font-stretch`. The effect: the number feels like it breathes —
 * swells as it enters the viewport, tightens as it exits, leaving a
 * trail of accent-color glow.
 *
 * Why this reads as a "weight morph" despite no variable axis:
 *   · size growth = more ink on screen (visual weight)
 *   · tighter letter-spacing + thicker glow = denser silhouette
 *   · brightness shift from accent-1 pink → paper-white at peak
 *
 * Driven by ScrollTrigger scrub per number. No GSAP timeline bloat —
 * this is a single interpolation per element.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initNumberMorph(): void {
  if (typeof window === 'undefined') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.classList.contains('motion-off');

  const numbers = document.querySelectorAll<HTMLElement>('.process-steps-pro .step .n');
  if (numbers.length === 0) return;

  if (reduced) {
    numbers.forEach((el) => {
      el.style.setProperty('--n-scale', '1');
      el.style.setProperty('--n-glow', '0px');
    });
    return;
  }

  numbers.forEach((el) => {
    // Symmetrical morph: 0 → 1 (swell) → 0 (shrink back). Use a
    // single scrub with an onUpdate that computes a bell curve from
    // the step's progress — cleaner than two triggers per element.
    ScrollTrigger.create({
      trigger: el.closest('.step'),
      start: 'top 90%',
      end: 'bottom 10%',
      scrub: 0.8,
      onUpdate: (self) => {
        // bell curve: peak at 0.5 progress, edges at 0/1
        const p = self.progress;
        const bell = Math.sin(p * Math.PI);          // 0..1..0
        const scale = 1 + bell * 0.12;                // up to +12%
        const glow = bell * 34;                       // px
        const ls = -0.02 - bell * 0.012;              // em, tightens at peak
        const light = bell * 0.55;                    // 0..0.55 lighten
        el.style.setProperty('--n-scale', scale.toFixed(3));
        el.style.setProperty('--n-glow', glow.toFixed(1) + 'px');
        el.style.setProperty('--n-ls', ls.toFixed(4) + 'em');
        el.style.setProperty('--n-light', light.toFixed(3));
      }
    });
  });
}
