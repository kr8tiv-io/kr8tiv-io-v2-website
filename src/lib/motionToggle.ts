/**
 * Visible in-page motion toggle. Persists in localStorage and wraps
 * the state flip in a View Transition crossfade where supported.
 *
 * WCAG 2.2 SC 2.2.2 / 2.3.3 require a visible control — the OS-level
 * `prefers-reduced-motion` query is not sufficient on its own.
 */
const STORE_KEY = 'prism-motion';

export function initMotionToggle(): void {
  const btn = document.getElementById('motion-toggle');
  if (!btn) return;
  const html = document.documentElement;

  const apply = (off: boolean): void => {
    html.classList.toggle('motion-off', off);
    btn.classList.toggle('off', off);
    btn.classList.toggle('on', !off);
    btn.setAttribute('aria-pressed', String(!off));
    btn.setAttribute('title', off ? 'Motion off — click to enable' : 'Motion on — click to reduce');
  };

  // Seed from localStorage. Motion defaults to ON regardless of OS
  // preference — the visible toggle is the user's escape hatch, and
  // some users have prefers-reduced-motion enabled system-wide for
  // unrelated apps but still expect this site's motion to render
  // (cursor trails, magnetic field, prism). Only honor an explicit
  // 'off' that the user themselves clicked previously.
  const stored = localStorage.getItem(STORE_KEY);
  apply(stored === 'off');

  btn.addEventListener('click', () => {
    const next = !html.classList.contains('motion-off');
    const run = (): void => {
      apply(next);
      localStorage.setItem(STORE_KEY, next ? 'off' : 'on');
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(run);
    } else {
      run();
    }
  });
}
