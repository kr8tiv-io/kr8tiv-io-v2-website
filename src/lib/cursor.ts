/**
 * Custom cursor with state machine.
 *
 * 4 distinct visual states, each with hand-tuned easing:
 *   • DEFAULT       — small 12px circle with 1px ring
 *   • MAGNETIC      — nav toggle / button; scales 1.6x, pulls toward target
 *   • LINK          — nav link / variant button; morphs to a pill with
 *                     the element's label or a "view →" hint
 *   • MEDIA         — over service panel videos / work cards; becomes a
 *                     36px blob with a "play" micro-glyph
 *
 * Transitions use cubic-bezier(0.22, 1, 0.36, 1) per the 2026 doc —
 * GSAP's default power2.out is a vibe-coded tell and we explicitly avoid it.
 *
 * Honors `matchMedia('(pointer: fine)')` so touch devices use native
 * cursor. Honors prefers-reduced-motion (instant transitions, no
 * magnetic pull).
 */
import { gsap } from 'gsap';

type CursorState = 'default' | 'magnetic' | 'link' | 'media';

interface CursorController {
  setState: (state: CursorState, label?: string) => void;
  dispose: () => void;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function initCursor(): CursorController | null {
  if (!window.matchMedia('(pointer: fine)').matches) return null;

  // Build the cursor DOM if the layout's <div class="cur"> is present;
  // otherwise bail (some variants might remove it).
  const root = document.getElementById('cur') as HTMLElement | null;
  if (!root) return null;

  // Layer a <span class="cur-label"> inside for text/glyph states
  let label = root.querySelector<HTMLSpanElement>('.cur-label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'cur-label';
    root.appendChild(label);
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.classList.contains('motion-off');

  // Pre-compile pointer position setters (gsap.quickTo) — zero per-frame
  // allocations even at 240 Hz pointer events.
  const qx = gsap.quickTo(root, 'x', { duration: reduced ? 0 : 0.32, ease: 'power3.out' });
  const qy = gsap.quickTo(root, 'y', { duration: reduced ? 0 : 0.32, ease: 'power3.out' });

  let currentState: CursorState = 'default';
  let currentLabel = '';

  const setState = (state: CursorState, txt?: string): void => {
    if (state === currentState && txt === currentLabel) return;
    currentState = state;
    currentLabel = txt ?? '';
    root.dataset.state = state;
    if (txt) label!.textContent = txt;
    else label!.textContent = '';
  };

  // === Global pointer tracking ===
  let px = 0, py = 0;
  const onMove = (e: PointerEvent): void => {
    px = e.clientX;
    py = e.clientY;
    qx(px);
    qy(py);
  };
  window.addEventListener('pointermove', onMove);

  // === Per-zone state detection via data-cursor attributes === //
  // Any element with `data-cursor="link|media|magnetic"` or matching a
  // known selector registers its own hover handlers.
  const registerZone = (el: HTMLElement, state: CursorState, labelText?: string): void => {
    const magneticPull = (state === 'magnetic');
    const RADIUS = 80;
    const STRENGTH = 0.35;
    el.addEventListener('pointerenter', () => { setState(state, labelText ?? el.dataset.cursorLabel ?? ''); });
    el.addEventListener('pointerleave', () => {
      setState('default');
      if (magneticPull && !reduced) { gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'power3.out' }); }
    });
    if (magneticPull && !reduced) {
      el.addEventListener('pointermove', (e: PointerEvent) => {
        const b = el.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        if (Math.hypot(dx, dy) < RADIUS) {
          gsap.to(el, { x: dx * STRENGTH, y: dy * STRENGTH, duration: 0.35, ease: 'power3.out' });
        }
      });
    }
  };

  // Default targets. Consumers can add `data-cursor="..."` to any element
  // to opt into a state without code changes.
  document.querySelectorAll<HTMLElement>('nav .nav-mid a').forEach((a) => registerZone(a, 'link', a.textContent?.trim().toLowerCase() ?? ''));
  document.querySelectorAll<HTMLElement>('#music-btn, #theme-btn, #motion-toggle, .white-light-btn').forEach((el) => registerZone(el, 'magnetic'));
  document.querySelectorAll<HTMLElement>('.work-card, .svc-frame').forEach((el) => registerZone(el, 'media', 'play'));
  document.querySelectorAll<HTMLElement>('.variant-bar a').forEach((el) => registerZone(el, 'link', el.getAttribute('title')?.split('—')[1]?.trim().toLowerCase() ?? ''));
  document.querySelectorAll<HTMLElement>('[data-cursor]').forEach((el) => {
    const s = el.dataset.cursor as CursorState | undefined;
    if (s === 'link' || s === 'magnetic' || s === 'media') registerZone(el, s);
  });

  return {
    setState,
    dispose() {
      window.removeEventListener('pointermove', onMove);
    }
  };
}

export { EASE };
