/**
 * Menu Lab · Concept 01 — Multi-State 侍.
 *
 * The nav inside this demo reshapes as the user scrolls through the
 * mini-page. States:
 *   · hero   — just the brand lockup, minimum chrome
 *   · body   — links fade in, hairline bottom border
 *   · final  — progress indicator ("step 3 / 3") joins the bar
 *
 * Uses IntersectionObserver against each section's midpoint so the
 * state transitions feel like scroll-driven native behavior, not
 * a JS ping.
 */
export function initMultiState(selector = '.ml-ms'): void {
  const host = document.querySelector<HTMLElement>(selector);
  if (!host) return;
  const nav = host.querySelector<HTMLElement>('.ms-nav');
  if (!nav) return;
  const links = nav.querySelectorAll<HTMLAnchorElement>('.ms-links a');
  const progress = nav.querySelector<HTMLElement>('.ms-progress');
  const sections = host.querySelectorAll<HTMLElement>('.ms-section');

  // Each section declares its state via data-state (hero | body | final)
  // and its target link index via data-link.
  const setState = (s: string, idx: number, total: number): void => {
    nav.dataset.state = s;
    links.forEach((a, i) => a.classList.toggle('current', i === idx));
    if (progress) progress.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target as HTMLElement;
      const state = el.dataset.state ?? 'body';
      const idx = parseInt(el.dataset.link ?? '0', 10);
      setState(state, idx, sections.length);
    });
  }, { root: host, threshold: [0.4] });
  sections.forEach((s) => io.observe(s));
}
