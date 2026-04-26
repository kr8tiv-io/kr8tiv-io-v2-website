/**
 * magneticField — 2D canvas particle field that migrates toward the
 * cursor with gravitational attraction + drag, draws faint connecting
 * lines between nearby particles, and persists a soft motion trail
 * via per-frame alpha-fill.
 *
 * Ported from the legacy v9-magnetic variant, retuned to the cyber-
 * renaissance palette: particles + lines pick up the same colour the
 * 侍 kanji wears (magenta `--accent-1` in dark mode, deeper rose in
 * light mode).
 *
 * Architecture:
 *   · Canvas2D, ~240 particles, single rAF loop
 *   · Fillrect at 12% black per frame produces the smear/trail
 *   · Force = clamp(1200 / d², 0.15) so close particles slingshot,
 *     far particles drift gently
 *   · Edge-wrap (no hard boundary) so particles teleport instead
 *     of stacking at the edges
 *   · O(N²) line draw gated by d² < 8000 — N=240 means ~28k tests
 *     per frame, fine for a transient overlay
 *
 * Public API: `initMagneticField(target, opts) → { dispose() }`.
 * Caller is responsible for calling `dispose()` when the overlay
 * closes so the rAF loop stops and the canvas detaches cleanly.
 */

export interface MagneticFieldHandle {
  dispose(): void;
}

export interface MagneticFieldOptions {
  /** Number of particles (default 240). */
  count?: number;
  /**
   * RGB triplet (each 0..255) used for particles + connecting lines.
   * Default `[255, 106, 213]` — `--accent-1` magenta, the same colour
   * the 侍 kanji wears in dark mode.
   */
  color?: [number, number, number];
  /** Maximum distance² for line drawing between particles (default 8000). */
  linkDist2?: number;
  /** Per-frame trail fade alpha (default 0.12). Lower = longer trails. */
  trailFade?: number;
  /** Background colour the trail fade paints over (default '5,5,7' RGB). */
  trailBg?: string;
}

export function initMagneticField(
  target: HTMLElement,
  opts: MagneticFieldOptions = {}
): MagneticFieldHandle | null {
  /* Reduced-motion / motion-off → run at half the particle count
     instead of bailing entirely. The field is the menu's main
     visual element now; killing it leaves a black void. */
  const reduced =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('motion-off');

  const cfg = {
    count: opts.count ?? (reduced ? 90 : 240),
    color: opts.color ?? ([255, 106, 213] as [number, number, number]),
    linkDist2: opts.linkDist2 ?? 8000,
    trailFade: opts.trailFade ?? 0.12,
    trailBg: opts.trailBg ?? '5,5,7',
  };

  const canvas = document.createElement('canvas');
  canvas.className = 'mag-field-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  if (getComputedStyle(target).position === 'static') {
    target.style.position = 'relative';
  }
  /* Prepend (not append) so the canvas sits BEHIND any sibling
     position:absolute elements (labels, the center kanji, the close
     button) without needing explicit z-index management on each. */
  target.insertBefore(canvas, target.firstChild);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    canvas.remove();
    return null;
  }

  /* Per-particle state. r is rendered radius, hueJitter wobbles the
     core colour ±some HSL hue so the field doesn't read as one
     uniform tone — gives texture without changing brand colour. */
  interface P { x: number; y: number; vx: number; vy: number; r: number; hueJ: number; }
  const particles: P[] = [];

  let w = 0;
  let h = 0;
  const resize = (): void => {
    const r = target.getBoundingClientRect();
    /* Fall back to viewport size if the target's bounding rect is
       0×0 — happens when the overlay is mid-CSS-transition or has
       visibility:hidden applied at init time. Without this fallback
       the canvas paints into a 1px buffer and looks dead. */
    const rw = r.width > 0 ? r.width : window.innerWidth;
    const rh = r.height > 0 ? r.height : window.innerHeight;
    w = Math.max(1, Math.round(rw));
    h = Math.max(1, Math.round(rh));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  /* Re-measure after the next frame in case the overlay's CSS
     transition was still settling at init time. */
  requestAnimationFrame(resize);

  /* Seed particles uniformly across the field at zero velocity.
     Slightly smaller default radius range than the v9 original
     (0.3–1.9 → 0.25–1.4) — at higher density (520 vs 240) tighter
     dots read as a finer mist instead of a clump. */
  for (let i = 0; i < cfg.count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: 0,
      vy: 0,
      r: Math.random() * 1.15 + 0.25,
      hueJ: (Math.random() - 0.5) * 18, // ±9°
    });
  }

  /* Mouse position — centre by default so the field has a focal
     point even before the cursor moves. Tracked at window-level so
     the cursor pulls particles even when hovering over labels and
     other UI on top of the canvas. */
  let mx = w / 2;
  let my = h / 2;
  const onMove = (e: PointerEvent): void => {
    const r = target.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
  };
  window.addEventListener('pointermove', onMove);

  const ro = new ResizeObserver(resize);
  ro.observe(target);

  /* Convert RGB → HSL hue for per-particle colour wobble. We just
     need the hue; saturation + lightness are fixed in the render
     loop so the colour stays in brand range. */
  const [R, G, B] = cfg.color;
  const rN = R / 255, gN = G / 255, bN = B / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const dHL = max - min;
  let baseHue = 0;
  if (dHL !== 0) {
    if (max === rN) baseHue = ((gN - bN) / dHL) % 6;
    else if (max === gN) baseHue = (bN - rN) / dHL + 2;
    else baseHue = (rN - gN) / dHL + 4;
    baseHue *= 60;
    if (baseHue < 0) baseHue += 360;
  }

  let raf = 0;
  let running = true;
  const tick = (): void => {
    if (!running) return;

    /* Trail fade — paint the bg over the previous frame at low alpha
       so motion smears instead of crisp-erasing. */
    ctx.fillStyle = `rgba(${cfg.trailBg},${cfg.trailFade})`;
    ctx.fillRect(0, 0, w, h);

    /* Update + draw particles. */
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i] as P;
      const dx = mx - p.x;
      const dy = my - p.y;
      const d2 = dx * dx + dy * dy + 0.01;
      const d = Math.sqrt(d2);
      const f = Math.min(0.15, 1200 / d2);
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx;
      p.y += p.vy;

      /* Edge-wrap so particles always have somewhere to go. */
      if (p.x < 0) p.x += w;
      else if (p.x > w) p.x -= w;
      if (p.y < 0) p.y += h;
      else if (p.y > h) p.y -= h;

      /* Alpha rises sharply near the cursor; gives the focal point
         visible heat. Floor 0.32 so the resting field is clearly
         visible at first paint, not just under the cursor. */
      const alpha = Math.min(0.95, 60 / d + 0.32);
      const hue = (baseHue + p.hueJ + 360) % 360;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue.toFixed(0)},92%,74%,${alpha.toFixed(3)})`;
      ctx.fill();
    }

    /* Connecting lines for particles within linkDist². Same hue/sat
       as the particles, very low alpha so the field reads as smoke
       not a cage. */
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i] as P;
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j] as P;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < cfg.linkDist2) {
          /* Bumped from 0.10 → 0.22 — the original v9 field had pure
             black bg + bright cyan; over our radial-gradient bg the
             lines need more contrast to register. */
          const lineAlpha = (1 - d2 / cfg.linkDist2) * 0.22;
          ctx.strokeStyle = `rgba(${R},${G},${B},${lineAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      canvas.remove();
    },
  };
}
