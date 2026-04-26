/**
 * Visible in-page motion toggle. Persists in localStorage and wraps
 * the state flip in a View Transition crossfade where supported.
 *
 * WCAG 2.2 SC 2.2.2 / 2.3.3 require a visible control — the OS-level
 * `prefers-reduced-motion` query is not sufficient on its own.
 */
/* Bumped from 'prism-motion' to 'prism-motion-v2' so any stale 'off'
   stored on the site from earlier testing sessions (when motion-off
   used to be the default for OS prefers-reduced-motion users) is
   ignored. Fresh seed = motion ON. The user explicitly asked for
   "animations on by default" — this guarantees first paint after
   redeploy is animated regardless of past localStorage state. */
const STORE_KEY = 'prism-motion-v2';
const LEGACY_STORE_KEY = 'prism-motion';

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

  // Clean up the legacy storage key so any old 'off' value can't
  // creep back in via stale tabs.
  try { localStorage.removeItem(LEGACY_STORE_KEY); } catch {}

  // Seed from localStorage. Motion defaults to ON regardless of OS
  // preference — the visible toggle is the user's escape hatch, and
  // some users have prefers-reduced-motion enabled system-wide for
  // unrelated apps but still expect this site's motion to render
  // (cursor trails, magnetic field, prism). Only honor an explicit
  // 'off' that the user themselves clicked previously on THIS key.
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
