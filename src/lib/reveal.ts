/**
 * Splash reveal — pulls the logo mask through the camera and fades in
 * the hero UI at the end. Pinned timeline; scrub-driven.
 *
 * GSAP 3.13 SVG transform note: use `svgOrigin: '0 0'` to pin the
 * scale origin to the SVG user-space origin (the logo path is
 * pre-translated so its visual centre sits exactly at 0,0). Without
 * this, 3.13 computes origin from the bounding box and the logo flies
 * toward the bottom-right instead of coming at the camera.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register at MODULE load time, not inside initReveal(). Astro bundles each
// component's <script> as an independent ES module — they resolve in
// parallel, so there's no guarantee scrollCore.ts's init has run by the
// time Hero's script calls initReveal. Registering here (idempotent) makes
// the plugin available the instant this module is imported.
gsap.registerPlugin(ScrollTrigger);

export function initReveal(): void {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const group = document.getElementById('logo-mask-group');
  const cover = document.getElementById('reveal-cover');
  if (!group || !cover) return;

  // Any core-set hero parallax tweens from legacy code paths get killed
  // so the pinned reveal owns the scene.
  gsap.killTweensOf(['.hero-bg video', '.hero-fx', '.hero-title']);
  ScrollTrigger.getAll().forEach((st) => {
    const t = st.trigger as Element | undefined;
    if (t && t.nodeType === 1 &&
      (t.matches('.hero, .hero-bg, .hero-fx, .hero-reveal') || t.closest('.hero-reveal'))) {
      st.kill();
    }
  });

  gsap.set('.reveal-sticky > .hero-bg video', { scale: 1.35, transformOrigin: 'center top' });
  // Logo zoom anchor — MUST keep the scale centered so the mark
  // "comes at the camera" instead of flying to a corner. svgOrigin:'0 0'
  // worked under older GSAP builds but flickered back to corner-drift
  // in 3.13 when the dev-server re-optimized deps. Belt-and-braces:
  //   1. CSS transform-box + origin declared on the element itself
  //   2. GSAP transformOrigin set explicitly (overrides svgOrigin auto)
  //   3. svgOrigin:'0 0' kept as a fallback for older builds
  (group as unknown as SVGGraphicsElement).style.transformBox = 'view-box';
  (group as unknown as SVGGraphicsElement).style.transformOrigin = 'center center';
  gsap.set(group, { scale: 1, svgOrigin: '0 0', transformOrigin: '50% 50%' });
  gsap.set(cover, { attr: { 'fill-opacity': 1 }, opacity: 1 });
  gsap.set('.samurai-mark', { opacity: 1, scale: 1, y: 0 });
  gsap.set('.reveal-hint', { opacity: 1, y: 0 });
  gsap.set('.hero-reveal .hero-ui', { opacity: 0, pointerEvents: 'none' });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hero-reveal',
      // Extended from +=1500 to +=2600 — the splash reveal is the
      // highest-craft moment on the page; letting it hang ~75% longer
      // gives first-time visitors time to register the logo shatter,
      // the obelisk scene behind it, and the hero-ui fade-in instead
      // of blowing past in a single wheel flick. Scrub stays at 0.7
      // so backward scroll plays the whole sequence in reverse.
      start: 'top top',
      end: '+=2600',
      pin: true,
      pinSpacing: true,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true
    }
  });

  tl.to(group, { scale: 22, svgOrigin: '0 0', transformOrigin: '50% 50%', ease: 'power2.in' }, 0);
  tl.to('.reveal-cue', { opacity: 0, y: 24 }, 0);
  tl.to('.samurai-mark', { opacity: 0, scale: 0.92, y: -30 }, 0.2);
  tl.to(cover, { attr: { 'fill-opacity': 0 }, ease: 'power1.inOut' }, 0.68);
  tl.to('.hero-reveal .hero-ui', { opacity: 1, pointerEvents: 'auto' }, 0.8);
}
