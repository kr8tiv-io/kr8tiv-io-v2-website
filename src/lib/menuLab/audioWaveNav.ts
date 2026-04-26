/**
 * Menu Lab · Concept 08 — Audio Waveform Nav.
 *
 * Renders a static pseudo-waveform (we don't have time to decode the
 * full MP3, so we seed from a stable hash so it's visually consistent
 * across reloads). When the site's music is on we tap KR8AUDIO for a
 * live level + modulate the peaks. Labels float above specific peaks
 * and act as nav links.
 */

interface KR8Audio { getLevel: () => number; }

const NAV_ITEMS = [
  { x: 0.08, label: 'Doctrine' },
  { x: 0.22, label: 'Work' },
  { x: 0.38, label: 'Process' },
  { x: 0.54, label: 'Why' },
  { x: 0.72, label: 'Start' },
  { x: 0.88, label: 'Book ↳' }
];

// Deterministic seeded bar heights so the waveform is stable across
// reloads but still looks organic.
function seededBars(n: number, seed = 7): number[] {
  const bars: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    // Layer a sine + noise so peaks hit near our label positions
    const peakBias = NAV_ITEMS.reduce((acc, it) => {
      return acc + Math.exp(-((i / n - it.x) ** 2) * 360) * 0.8;
    }, 0);
    bars.push(0.18 + Math.sin(i * 0.14) * 0.1 + r * 0.22 + peakBias);
  }
  return bars;
}

export function initAudioWaveNav(selector = '.ml-audiowave'): void {
  const hostMaybe = document.querySelector<HTMLElement>(selector);
  if (!hostMaybe) return;
  const host: HTMLElement = hostMaybe;

  const canvas = document.createElement('canvas');
  host.insertBefore(canvas, host.firstChild);
  const ctxMaybe = canvas.getContext('2d');
  if (!ctxMaybe) return;
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  const labelsEl = host.querySelector<HTMLElement>('.aw-labels') ?? (() => {
    const el = document.createElement('div');
    el.className = 'aw-labels';
    host.appendChild(el);
    return el;
  })();
  labelsEl.innerHTML = '';

  const BAR_COUNT = 120;
  const bars = seededBars(BAR_COUNT);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Place labels
  NAV_ITEMS.forEach((item) => {
    const a = document.createElement('button');
    a.className = 'aw-label';
    a.textContent = item.label;
    a.style.left = (item.x * 100).toFixed(1) + '%';
    labelsEl.appendChild(a);
  });

  const resize = (): void => {
    const r = host.getBoundingClientRect();
    canvas.width = Math.floor(r.width * dpr);
    canvas.height = Math.floor(220 * dpr);
    canvas.style.width = r.width + 'px';
    canvas.style.height = '220px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let visible = true;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { visible = e.isIntersecting; });
  });
  io.observe(host);

  function tick(now: number): void {
    if (!visible) {
      requestAnimationFrame(tick);
      return;
    }
    const r = host.getBoundingClientRect();
    const W = r.width;
    const H = 220;
    ctx.clearRect(0, 0, W, H);

    const lv = (window as unknown as { KR8AUDIO?: KR8Audio }).KR8AUDIO?.getLevel() ?? 0;
    const live = lv > 0.01;
    const gap = 2;
    const bw = (W - gap * (BAR_COUNT - 1)) / BAR_COUNT;

    for (let i = 0; i < BAR_COUNT; i++) {
      const base = bars[i]!;
      // When audio is on, bars near the current phase animate taller.
      const liveMul = live ? 1 + lv * 1.2 * (0.5 + 0.5 * Math.sin(now * 0.004 + i * 0.25)) : 1;
      const h = Math.min(H * 0.88, H * base * liveMul);
      const x = i * (bw + gap);
      const y = H - h;
      // Gradient top = pink, bottom = purple
      const g = ctx.createLinearGradient(0, y, 0, H);
      g.addColorStop(0, live ? 'rgba(255,106,213,.95)' : 'rgba(255,106,213,.85)');
      g.addColorStop(1, 'rgba(142,0,255,.2)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, bw, h);

      // Highlight near label positions
      NAV_ITEMS.forEach((item) => {
        if (Math.abs(i / BAR_COUNT - item.x) < 0.02) {
          ctx.fillStyle = 'rgba(255,209,102,.9)';
          ctx.fillRect(x, y - 3, bw, 3);
        }
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Toggle button proxies the site's music toggle if present
  const toggle = host.querySelector<HTMLButtonElement>('.aw-toggle');
  toggle?.addEventListener('click', () => {
    const musicBtn = document.getElementById('music-btn') as HTMLButtonElement | null;
    musicBtn?.click();
    toggle.classList.toggle('on');
    toggle.textContent = toggle.classList.contains('on') ? '♪ playing' : '♪ play music';
  });
}
