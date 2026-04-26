/**
 * Multi-State 侍 — site-wide contextual nav behavior (Hybrid · layer 1/3).
 *
 * The top <nav> element has its `data-nav-state` attribute set by
 * this module, and CSS reacts to the state:
 *
 *   hero   — brand only; inline links hidden; chrome minimal
 *   body   — links fade in; hairline bottom rule appears
 *   final  — accent tint + page-progress indicator shown
 *
 * State selection priority:
 *   1. If any <section> on the page has `data-nav-state="final"`,
 *      entering it flips the state to `final`. Same for `body`.
 *   2. Otherwise: scroll-Y threshold. 0–80vh = hero; past 80vh = body.
 *
 * Progress indicator:
 *   · On the homepage, shows overall scroll percent.
 *   · On /start/, hooks into the existing #intake-pct element.
 *   · On /process/, shows "N / 9" based on which .step is active.
 *
 * Completely motion-toggle + reduced-motion aware — the CSS does
 * the transitions, JS only toggles attributes.
 */

export interface MultiStateOptions {
  navSelector?: string;
  progressElSelector?: string;
  defaultInitial?: 'hero' | 'body' | 'final';
}

export function initMultiStateNav(opts: MultiStateOptions = {}): void {
  const navSel = opts.navSelector ?? 'nav';
  const nav = document.querySelector<HTMLElement>(navSel);
  if (!nav) return;

  // Allow per-page opt out via <nav data-multi-state="off">
  if (nav.dataset.multiState === 'off') return;

  // Determine initial state:
  //   · If <html data-nav-initial> is set, start there (e.g., subpages)
  //   · Otherwise 'hero'
  const htmlInitial = document.documentElement.dataset.navInitial as 'hero' | 'body' | 'final' | undefined;
  const initial = htmlInitial ?? opts.defaultInitial ?? 'hero';
  setState(initial);

  // --- state setter ---
  function setState(s: 'hero' | 'body' | 'final'): void {
    if (nav!.dataset.navState === s) return;
    nav!.dataset.navState = s;
  }

  // --- observe sections with data-nav-state ---
  // Explicitly exclude the nav element itself — it carries data-nav-state
  // as the *output* target, so observing it would create a feedback loop.
  //
  // ALWAYS run the scroll-Y fallback in parallel with the observer.
  // Without it, scroll positions between tagged sections were leaving
  // the nav stuck at the last-set state (e.g., staying "hero" through
  // the entire body of the page because nothing in the middle is
  // tagged). Tagged sections win when they're actively in view;
  // scroll-Y handles the gaps.
  const tagged = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-state]'))
    .filter((el) => el !== nav);
  let taggedActive = false; // IO has a section in view → suppress scroll fallback

  if (tagged.length > 0) {
    const io = new IntersectionObserver((entries) => {
      let best: IntersectionObserverEntry | null = null;
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      });
      if (best) {
        taggedActive = true;
        const s = (best as IntersectionObserverEntry).target.getAttribute('data-nav-state') as 'hero' | 'body' | 'final' | null;
        if (s) setState(s);
      } else {
        // No tagged section is prominently in view — let scroll-Y take over.
        taggedActive = false;
      }
    }, { rootMargin: '-30% 0px -30% 0px', threshold: [0, 0.25, 0.5, 0.75] });
    tagged.forEach((t) => io.observe(t));
  }

  // Scroll-Y fallback — kicks in wherever no tagged section dominates.
  let raf = 0;
  const onScroll = (): void => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (taggedActive) return; // IO is driving, leave it alone
      const y = window.scrollY;
      const vh = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      if (y < vh * 0.55) setState(initial);                       // at top
      else if (y > docH - vh * 1.8) setState('final');            // near bottom
      else setState('body');                                      // middle
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- progress indicator ---
  const progEl = document.querySelector<HTMLElement>(opts.progressElSelector ?? '.nav-progress');
  if (progEl) {
    // Priority: intake form pct → process step counter → scroll pct
    const intakePct = document.getElementById('intake-pct');
    const steps = document.querySelectorAll<HTMLElement>('.process-steps-pro .step');

    if (intakePct) {
      // Mirror the intake form's own pct value (live updated by intakeForm.ts)
      const sync = (): void => { if (progEl && intakePct) progEl.textContent = intakePct.textContent || '0%'; };
      new MutationObserver(sync).observe(intakePct, { childList: true, characterData: true, subtree: true });
      sync();
    } else if (steps.length > 0) {
      // Track which step is centered in viewport → "N / 9"
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const idx = Array.from(steps).indexOf(e.target as HTMLElement) + 1;
          progEl.textContent = `${String(idx).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
        });
      }, { rootMargin: '-40% 0px -50% 0px' });
      steps.forEach((s) => io.observe(s));
    } else {
      // Overall scroll percent
      const onScroll = (): void => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0;
        progEl.textContent = pct + '%';
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }
}
