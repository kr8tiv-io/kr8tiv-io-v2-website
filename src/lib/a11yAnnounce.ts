/**
 * ARIA live-region scene announcer.
 *
 * Announces the name of the current major section to screen readers
 * when it scrolls into view. Debounced so fast scrolling through the
 * page doesn't produce announcement spam.
 *
 * Satisfies WCAG 2.4.8 "Location" and the SOTD Dev Award expectation
 * that scroll-driven sites describe their structure to non-visual
 * users. Invisible visually (.sr-only pattern), read by AT.
 */
const SCENES: Array<{ selector: string; label: string }> = [
  { selector: '.hero-reveal',    label: 'Hero — splash reveal' },
  { selector: '.doctrine',        label: 'Doctrine — four statements we live by' },
  { selector: '.services',        label: 'Services — eleven disciplines' },
  { selector: '.why',             label: 'Why — the founder manifesto' },
  { selector: '.process',         label: 'Process — four phases' },
  { selector: '.work',            label: 'Work — selected case studies' },
  { selector: '.reel',            label: 'Reel — death to generic' },
  { selector: '.contact',         label: 'Contact — start a project' }
];

let region: HTMLDivElement | null = null;
let lastAnnounced = '';
let debounceTimer: number | null = null;

function ensureRegion(): HTMLDivElement {
  if (region) return region;
  region = document.createElement('div');
  region.id = 'scene-announcer';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  // Screen-reader-only: visually hidden, still announced.
  Object.assign(region.style, {
    position: 'absolute',
    width: '1px', height: '1px',
    padding: '0', margin: '-1px',
    overflow: 'hidden', clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap', border: '0'
  });
  document.body.appendChild(region);
  return region;
}

function announce(text: string): void {
  if (text === lastAnnounced) return;
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    const r = ensureRegion();
    r.textContent = text;
    lastAnnounced = text;
  }, 220);
}

export function initSceneAnnouncer(): void {
  ensureRegion();
  const entries = SCENES
    .map(({ selector, label }) => ({ el: document.querySelector(selector), label }))
    .filter((item): item is { el: Element; label: string } => Boolean(item.el));
  if (!entries.length) return;

  if (!('IntersectionObserver' in window)) {
    announce(entries[0].label);
    return;
  }

  const labels = new WeakMap<Element, string>();
  entries.forEach(({ el, label }) => labels.set(el, label));

  const io = new IntersectionObserver((observed) => {
    const best = observed
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!best) return;
    const label = labels.get(best.target);
    if (label) announce(label);
  }, {
    rootMargin: '-42% 0px -42% 0px',
    threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
  });

  entries.forEach(({ el }) => io.observe(el));
}
