/**
 * Theme handler — dark ↔ light toggle with persistence.
 *
 * Priority on first visit: saved pref → system pref → default dark.
 * Subsequent visits: saved pref always wins. System preference is
 * still watched live but only applied when there's no manual choice
 * in storage.
 *
 * Updates:
 *   · html[data-theme] attribute  → CSS rules in light-theme.css key off this
 *   · <meta name="theme-color">   → mobile browsers tint their chrome to match
 *   · localStorage                → choice persists across sessions
 *
 * Exposed on `#theme-btn` clicks via BaseLayout + FormLayout init scripts.
 */

const STORAGE_KEY = 'kr8tiv-theme';

export type Theme = 'dark' | 'light';

export function initTheme(): void {
  const html = document.documentElement;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');

  const apply = (theme: Theme): void => {
    html.dataset.theme = theme;
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#f5f2ea');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage disabled */ }
  };

  // Resolve initial theme
  let initial: Theme = 'dark';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') initial = saved;
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) initial = 'light';
  } catch { /* no-op */ }
  apply(initial);

  // Bind toggle button
  const btn = document.getElementById('theme-btn');
  btn?.addEventListener('click', () => {
    apply(html.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  // Live-follow system preference when user hasn't manually chosen
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;  // manual choice wins
    } catch { /* no-op */ }
    apply(e.matches ? 'light' : 'dark');
  });
}
