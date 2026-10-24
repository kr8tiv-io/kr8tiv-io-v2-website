/**
 * Theme handler — dark ↔ light toggle with persistence.
 *
 * Dark is ALWAYS the default. The OS prefers-color-scheme setting is
 * deliberately ignored; only an explicit click on #theme-btn switches
 * to light, and only that click is persisted. The inline bootstrap in
 * each layout's <head> applies the saved choice before first paint.
 *
 * Updates:
 *   · html[data-theme] attribute  → CSS rules in light-theme.css key off this
 *   · <meta name="theme-color">   → mobile browsers tint their chrome to match
 *   · localStorage                → choice persists across sessions
 *
 * Exposed on `#theme-btn` clicks via BaseLayout + FormLayout init scripts.
 */

const STORAGE_KEY = 'kr8tiv-theme-choice';

export type Theme = 'dark' | 'light';

export function initTheme(): void {
  const html = document.documentElement;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');

  const apply = (theme: Theme, persist = false): void => {
    html.dataset.theme = theme;
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#f5f2ea');
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage disabled */ }
    }
  };

  // Resolve initial theme
  let initial: Theme = 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') initial = saved;
  } catch { /* no-op */ }
  apply(initial);

  // Bind toggle button
  const btn = document.getElementById('theme-btn');
  btn?.addEventListener('click', () => {
    apply(html.dataset.theme === 'dark' ? 'light' : 'dark', true);
  });
}
