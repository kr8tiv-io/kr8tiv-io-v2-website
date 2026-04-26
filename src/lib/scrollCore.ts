/**
 * Smooth-scroll + GSAP ticker synchronization.
 *
 * Slaves Lenis into GSAP's rAF so the animation engine and the virtual
 * scroll share the same frame clock. `lagSmoothing(0)` prevents GSAP
 * from silently "catching up" on dropped frames — which is the root
 * cause of the horizontal-pin jitter that Lenis-without-sync produces.
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register immediately when this module is loaded so any other module
// that imports ScrollTrigger and creates a pin/trigger at its own
// module-load time still finds the plugin already registered.
gsap.registerPlugin(ScrollTrigger);

export interface ScrollCore {
  lenis: Lenis;
  gsap: typeof gsap;
  ScrollTrigger: typeof ScrollTrigger;
}

let instance: ScrollCore | null = null;

export function initScrollCore(): ScrollCore {
  if (instance) return instance;
  gsap.registerPlugin(ScrollTrigger);

  /* Tightened from duration: 1.4 → 0.85 + wheelMultiplier: 1.05 after
     user feedback that scroll felt slow + sticky. The previous 1.4s
     duration meant every wheel tick took 1.4s to catch up, so scroll
     felt syrupy and pinned sections compounded the lag. 0.85s is the
     sweet spot — still smooth, but the page tracks the wheel almost
     1:1 and pinned sections release sooner. The wheelMultiplier nudge
     also helps long pages feel less endless. */
  const lenis = new Lenis({
    duration: 0.85,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1.05,
    touchMultiplier: 1.6
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time: number) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  // Scroll-progress bar: feeds the .prog fixed strip at the top.
  lenis.on('scroll', ({ scroll, limit }: { scroll: number; limit: number }) => {
    const pb = document.getElementById('prog');
    if (pb) pb.style.width = (limit > 0 ? (scroll / limit) * 100 : 0) + '%';
  });

  instance = { lenis, gsap, ScrollTrigger };
  // Expose for debugging / for effects that want to read velocity.
  (window as unknown as { __KR8: ScrollCore }).__KR8 = instance;
  return instance;
}

export function getScrollCore(): ScrollCore | null { return instance; }
