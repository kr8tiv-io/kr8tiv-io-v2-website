/**
 * ASCII + Bayer-dither pass for the white-light easter egg.
 *
 * When the W key / footer button fires, a full-screen canvas renders
 * a pixel-mask dither of the page's current luminance onto the white
 * flash. The result is a momentary 1-bit / dithered stylization of
 * whatever was just on screen — the "white light" collapses color
 * into monochrome-dot typography before resolving back to full color.
 *
 * Pattern: Pablo Stanley's Codrops Efecto article (2026-01-04). We
 * use a Bayer 8x8 threshold matrix (standard) + an ASCII mapping so
 * each 8x8 screen tile becomes a single character drawn at that
 * brightness rank. No WebGL required — Canvas 2D is fast enough for
 * the ~350ms flash window.
 *
 * Activated by the `white-light:trigger` CustomEvent dispatched from
 * whiteLight.ts. Not a permanent overlay — paints one frame and then
 * fades itself.
 */

const BAYER_8 = [
  [ 0,32, 8,40, 2,34,10,42],
  [48,16,56,24,50,18,58,26],
  [12,44, 4,36,14,46, 6,38],
  [60,28,52,20,62,30,54,22],
  [ 3,35,11,43, 1,33, 9,41],
  [51,19,59,27,49,17,57,25],
  [15,47, 7,39,13,45, 5,37],
  [63,31,55,23,61,29,53,21]
];

// ASCII ramp from least to most dense — used to pick glyphs per tile.
const ASCII_RAMP = ' .,:;i1tfLCG08@';

let canvas: HTMLCanvasElement | null = null;

function ensureCanvas(): HTMLCanvasElement {
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.id = 'ascii-dither-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '10001',            // above white-light overlay (9998) + text (9999)
    opacity: '0',
    transition: 'opacity 220ms cubic-bezier(.22, 1, .36, 1)',
    mixBlendMode: 'screen'
  });
  document.body.appendChild(canvas);
  return canvas;
}

/**
 * Render one frame of ASCII-dithered pixel art sized to the viewport.
 * Samples a grid of luminance values (cheap, no page screenshot) and
 * maps them through the Bayer matrix + ASCII ramp.
 */
function paintFrame(): void {
  const c = ensureCanvas();
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);

  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const tile = 12;                           // px per glyph cell
  const cols = Math.ceil(w / tile);
  const rows = Math.ceil(h / tile);

  ctx.clearRect(0, 0, w, h);
  ctx.font = `${tile}px "JetBrains Mono", monospace`;
  ctx.textBaseline = 'top';

  // Procedural luminance field driven by a radial + sine pattern — gives
  // the dither a layered, cinematic feel. Real page screenshots would
  // require html2canvas which is too heavy for this brief flash.
  const cx = w / 2, cy = h / 2;
  const maxR = Math.hypot(cx, cy);
  const t = performance.now() / 1000;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = x * tile;
      const py = y * tile;
      const dx = px + tile / 2 - cx;
      const dy = py + tile / 2 - cy;
      const r = Math.hypot(dx, dy) / maxR;

      // Luminance: radial falloff + time-shifted ripple + Bayer threshold
      const wave = 0.5 + 0.5 * Math.sin(r * 22 - t * 2.6 + Math.atan2(dy, dx) * 3);
      const lum = Math.min(1, Math.max(0, (1 - r) * 0.7 + wave * 0.35));
      const bayer = BAYER_8[y & 7]![x & 7]! / 64;
      const lit = lum + (bayer - 0.5) * 0.18;
      const idx = Math.min(ASCII_RAMP.length - 1, Math.floor(lit * ASCII_RAMP.length));
      const ch = ASCII_RAMP[idx];
      if (ch === ' ' || !ch) continue;

      // Subtle prism-hued tint along the x axis — keeps it on-brand.
      const hue = (x / cols) * 280 + 250;   // 250° → 530° wraps to pink/magenta
      ctx.fillStyle = `hsla(${hue}, 82%, 62%, ${0.55 + lit * 0.35})`;
      ctx.fillText(ch, px, py);
    }
  }
}

let active = false;
let frameCount = 0;
let raf = 0;

function animate(): void {
  frameCount++;
  paintFrame();
  if (active) raf = requestAnimationFrame(animate);
}

function start(): void {
  if (active) return;
  active = true;
  frameCount = 0;
  const c = ensureCanvas();
  c.style.opacity = '0.85';
  raf = requestAnimationFrame(animate);
}

function stop(): void {
  active = false;
  cancelAnimationFrame(raf);
  const c = ensureCanvas();
  c.style.opacity = '0';
}

export function initAsciiDither(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Listen for the white-light trigger. whiteLight.ts dispatches both
  // phase events (open + close) so we can align the dither with the
  // white flash precisely.
  document.addEventListener('white-light:open', start);
  document.addEventListener('white-light:close', stop);
}
