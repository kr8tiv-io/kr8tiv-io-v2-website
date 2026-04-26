/**
 * Kinetic typography — scroll-velocity-driven variable weight axis.
 *
 * Does NOT run SplitText on chapter titles that already have a manual
 * `<span class="line">…<span class="it">…</span>…</span>` structure —
 * SplitText would unwrap and re-wrap the nested `.it` accent and leave
 * the italic word painted at the wrong line's baseline, producing the
 * word-overlap artefact the user reported.
 *
 * Instead: the variable weight axis (`--scroll-wght`) is applied
 * directly to the manual `.line > span` spans via a CSS rule in
 * prism.css, and we only run SplitText (with ARIA auto-preservation)
 * on plain-text elements that don't already have line wrappers.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { getScrollCore } from './scrollCore';

gsap.registerPlugin(SplitText);

export function initKineticType(): void {
  const reduced = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    || document.documentElement.classList.contains('motion-off');

  // Only split elements that don't already carry `.line` wrappers.
  // For this page, that's the reel headline and the services-intro
  // description paragraph. Everything else has manual splits already.
  const splittable = Array.from(document.querySelectorAll<HTMLElement>(
    '.services-intro p, .reel h2, .contact-head h2'
  )).filter((el) => !el.querySelector('.line'));

  splittable.forEach((el) => {
    SplitText.create(el, {
      type: 'words',
      wordsClass: 'st-word',
      aria: 'auto',
      autoSplit: true
    });
  });

  // Weight-axis animation. Applied via the `--scroll-wght` CSS variable
  // — any selector that opts in via `font-variation-settings: 'wght'
  // var(--scroll-wght, 400)` will animate. prism.css applies this to
  // .st-word and to the manual .line > span spans so both code paths
  // benefit without touching DOM.
  if (reduced) return;
  let smoothedVel = 0;
  gsap.ticker.add(() => {
    const core = getScrollCore();
    const lenisVel = core ? Math.abs(core.lenis.velocity ?? 0) : 0;
    const target = Math.min(lenisVel / 60, 1);
    smoothedVel = smoothedVel * 0.88 + target * 0.12;
    if (smoothedVel < 0.01) return;
    const wght = Math.round(300 + smoothedVel * 500);
    document.documentElement.style.setProperty('--scroll-wght', String(wght));
  });
}
