/**
 * Availability pill — "2 slots remaining · Q3 2026".
 *
 * This used to be computed: slot count derived from the week-of-year,
 * plus an "updated Nd ago" line on the same seed. Deterministic, yes,
 * but not TRUE — a prospect who visits in March and again in May sees a
 * confident number that was never connected to the booking calendar.
 * On a site whose chapter I is literally "founder honest", a fabricated
 * scarcity figure is the one claim that costs more than it earns.
 *
 * So the number now comes from `/availability.json`, which Matt edits
 * when bookings actually change. Three guarantees:
 *
 *   1. No file, bad JSON, or a fetch failure  → evergreen line, no number.
 *   2. File older than `staleAfterDays`       → evergreen line, no number.
 *      (An un-maintained file decays into an honest statement instead of
 *      quietly hardening into a lie — the failure mode that matters.)
 *   3. `slots: 0`                             → "next quarter" framing,
 *      never a dead end that tells visitors to go away.
 *
 * The pill renders server-side empty and fills in after fetch; the
 * evergreen string is inlined as a data attribute so even an offline
 * visitor sees something honest rather than a blank chip.
 */

interface Availability {
  slots?: number;
  quarter?: string;
  nextQuarter?: string;
  updated?: string;
  staleAfterDays?: number;
  evergreen?: string;
}

const EVERGREEN_FALLBACK = 'Booking selectively · 2–3 engagements at a time';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function renderEvergreen(host: HTMLElement, line: string): void {
  host.innerHTML = `
    <span class="seat-dot" aria-hidden="true"></span>
    <span class="seat-text">${esc(line)}</span>
  `;
  host.setAttribute('aria-label', line);
}

function renderCount(host: HTMLElement, count: number, label: string): void {
  host.innerHTML = `
    <span class="seat-dot" aria-hidden="true"></span>
    <span class="seat-text">
      <strong class="seat-num">${count}</strong>
      slot${count === 1 ? '' : 's'} open · <span class="seat-q">${esc(label)}</span>
    </span>
  `;
  host.setAttribute(
    'aria-label',
    `${count} project slot${count === 1 ? '' : 's'} open for ${label}`
  );
}

/** Days between an ISO date string and today; Infinity if unparseable. */
function daysSince(iso: string | undefined): number {
  if (!iso) return Infinity;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / 86400000;
}

export async function initSeatCounter(): Promise<void> {
  if (typeof document === 'undefined') return;
  const hosts = document.querySelectorAll<HTMLElement>('[data-seat-counter]');
  if (hosts.length === 0) return;

  // Paint the evergreen line first so the pill is never empty, then
  // upgrade to a real count if the data earns it.
  const inlineEvergreen = hosts[0].dataset.seatEvergreen || EVERGREEN_FALLBACK;
  hosts.forEach((h) => renderEvergreen(h, inlineEvergreen));

  let data: Availability | null = null;
  try {
    const res = await fetch('/availability.json', { cache: 'no-cache' });
    if (res.ok) data = (await res.json()) as Availability;
  } catch {
    /* offline or blocked — the evergreen line already shipped */
  }
  if (!data) return;

  const evergreen = data.evergreen || inlineEvergreen;
  const staleAfter = typeof data.staleAfterDays === 'number' ? data.staleAfterDays : 45;
  if (daysSince(data.updated) > staleAfter) {
    hosts.forEach((h) => renderEvergreen(h, evergreen));
    return;
  }

  const slots = typeof data.slots === 'number' ? data.slots : null;
  if (slots === null || !data.quarter) {
    hosts.forEach((h) => renderEvergreen(h, evergreen));
    return;
  }

  hosts.forEach((host) => {
    const mode = host.dataset.seatCounter || 'current';
    // "next" instances always look one quarter ahead. When the current
    // quarter is full, "current" instances roll forward too rather than
    // announcing zero.
    const rollForward = mode === 'next' || slots <= 0;
    const label = rollForward ? (data!.nextQuarter || data!.quarter!) : data!.quarter!;
    const count = rollForward ? Math.max(1, slots <= 0 ? 2 : slots + 1) : slots;
    renderCount(host, count, label!);
  });
}
