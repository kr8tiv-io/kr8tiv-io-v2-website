/**
 * Process-page step reveal — scrubbed GSAP per step.
 *
 * For each `.step` on the /process/ page, build a timeline scrubbed
 * to scroll progress. The step locks briefly to the viewport via a
 * short pin, then content slides into place as the user scrolls
 * past. Non-linear pacing: big number rockets in fast, body copy
 * settles in slowly, glyph rotates + scales to rest.
 *
 * Why scrub (not play/pause): feels hand-drawn — user's scroll is
 * the animation's time axis, so fast scrollers see it faster and
 * slow scrollers get to savor. Pin adds just enough "stickiness" to
 * the first read without trapping the reader.
 *
 * Respects: prefers-reduced-motion + html.motion-off (static layout,
 * no animation — content visible immediately).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initProcessSteps(): void {
  if (typeof window === 'undefined') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.classList.contains('motion-off');

  const steps = document.querySelectorAll<HTMLElement>('.process-steps-pro .step');
  if (steps.length === 0) return;

  // Static path for reduced-motion users: show everything, skip anim.
  if (reduced) {
    steps.forEach((s) => {
      s.style.opacity = '1';
      s.querySelectorAll<HTMLElement>('.n, .step-body, .step-visual, .pay, .ktitle')
        .forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
    });
    return;
  }

  steps.forEach((step) => {
    const n = step.querySelector<HTMLElement>('.n');
    const ktitle = step.querySelector<HTMLElement>('.ktitle');
    const h4 = step.querySelector<HTMLElement>('h4');
    const p = step.querySelector<HTMLElement>('p');
    const pay = step.querySelector<HTMLElement>('.pay');
    const visual = step.querySelector<HTMLElement>('.step-visual');

    // Initial state — everything offset / faded; scrub will interpolate.
    gsap.set([n, ktitle, h4, p, pay, visual].filter(Boolean), {
      opacity: 0
    });
    if (n) gsap.set(n, { x: -60, scale: 0.85 });
    if (ktitle) gsap.set(ktitle, { y: 14 });
    if (h4) gsap.set(h4, { y: 28, letterSpacing: '0.02em' });
    if (p) gsap.set(p, { y: 18 });
    if (pay) gsap.set(pay, { y: 10 });
    if (visual) gsap.set(visual, { y: 40, rotate: -3, scale: 0.94 });

    // One timeline per step; scrubbed to the step's viewport progress.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: step,
        start: 'top 82%',
        end: 'bottom 62%',
        scrub: 0.6,
        // Pin the first step slightly longer so the reader reads it
        // rather than blowing past. Later steps get tighter scrubs.
        pin: false,
        invalidateOnRefresh: true
      }
    });

    // Number first — it's the anchor
    tl.to(n, { opacity: 1, x: 0, scale: 1, duration: 0.35, ease: 'power2.out' }, 0)
      .to(ktitle, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.08)
      .to(h4, { opacity: 1, y: 0, letterSpacing: '-0.025em', duration: 0.5, ease: 'power2.out' }, 0.1)
      .to(p, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 0.2)
      .to(visual, { opacity: 1, y: 0, rotate: 0, scale: 1, duration: 0.55, ease: 'power3.out' }, 0.05);

    if (pay) tl.to(pay, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.4);

    // Subtle parallax for the visual as the step exits upward
    gsap.to(visual, {
      y: -50,
      ease: 'none',
      scrollTrigger: {
        trigger: step,
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      }
    });

    // Micro-tilt on mouse-move within the step (perf: rAF throttled)
    if (visual) {
      let raf = 0;
      const onMove = (e: MouseEvent): void => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = step.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
          const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
          visual.style.transform = `rotateX(${(-ny * 2.4).toFixed(2)}deg) rotateY(${(nx * 2.4).toFixed(2)}deg) scale(1.015)`;
          visual.style.transition = 'transform 120ms ease-out';
          raf = 0;
        });
      };
      const onLeave = (): void => {
        visual.style.transform = '';
        visual.style.transition = 'transform 360ms cubic-bezier(.22,1,.36,1)';
      };
      step.addEventListener('mousemove', onMove);
      step.addEventListener('mouseleave', onLeave);
    }

    // Progress indicator on the left — a vertical line that fills as
    // this step passes through viewport.
    const progress = document.createElement('span');
    progress.className = 'step-progress';
    progress.setAttribute('aria-hidden', 'true');
    step.appendChild(progress);
    gsap.to(progress, {
      '--fill': '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: step,
        start: 'top 70%',
        end: 'bottom 40%',
        scrub: true,
        onUpdate: (self) => {
          progress.style.setProperty('--fill', (self.progress * 100).toFixed(1) + '%');
        }
      }
    });
  });

  // Refresh after fonts load so metrics are correct.
  if ('fonts' in document) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
}
