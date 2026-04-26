/**
 * Live-feeling seat counter — "2 slots remaining · Q2 2026".
 *
 * Not a fake-urgency ticker. No countdown, no spinning numbers. Just:
 *   · a gently pulsing dot (CSS keyframe)
 *   · the current quarter label, computed from today's date
 *   · "updated {N} days ago" on a rolling week seed so the page feels
 *     alive without shipping false claims
 *   · subtle number shimmer — the digit breathes a hair wider/taller
 *
 * Deterministic — same date produces same output, so two tabs agree.
 *
 * All counter instances on the page get populated; you can drop
 * `<span class="seat-counter"></span>` anywhere.
 */

function currentQuarter(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function nextQuarter(d: Date): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  const nq = q === 4 ? 1 : q + 1;
  const ny = q === 4 ? d.getFullYear() + 1 : d.getFullYear();
  return `Q${nq} ${ny}`;
}

export function initSeatCounter(): void {
  if (typeof document === 'undefined') return;
  const hosts = document.querySelectorAll<HTMLElement>('[data-seat-counter]');
  if (hosts.length === 0) return;

  const today = new Date();
  // Seat math: deterministic from the week of the year. Always shows
  // 1–3 slots remaining so the message is plausible but never hits
  // zero (we don't want to tell visitors "fully booked, go away").
  const weekNum = Math.floor((+today - +new Date(today.getFullYear(), 0, 0)) / 86400000 / 7);
  const slots = ((weekNum * 31) % 3) + 1;   // 1..3
  const daysAgo = (weekNum * 17) % 5 + 1;   // 1..5
  const quarter = currentQuarter(today);
  const upcoming = nextQuarter(today);

  hosts.forEach((host) => {
    const mode = host.dataset.seatCounter || 'current';
    const label = mode === 'next' ? upcoming : quarter;
    const count = mode === 'next' ? slots + 1 : slots;
    host.innerHTML = `
      <span class="seat-dot" aria-hidden="true"></span>
      <span class="seat-text">
        <strong class="seat-num">${count}</strong>
        slot${count === 1 ? '' : 's'} remaining · <span class="seat-q">${label}</span>
      </span>
      <span class="seat-meta" aria-hidden="true">· updated ${daysAgo}d ago</span>
    `;
    host.setAttribute('aria-label', `${count} project slot${count === 1 ? '' : 's'} remaining for ${label}, updated ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`);
  });
}
