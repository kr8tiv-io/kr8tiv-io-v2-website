/**
 * Particle swarm behind "ZERO ADULT SUPERVISION".
 *
 * Canvas2D field of ~80 soft dots drifting with gentle Perlin-like
 * noise. Dots connect with thin lines when within a proximity
 * radius — reads as a constellation, not a jellyfish. Mouse acts as
 * a gentle repulsor: particles subtly avoid the cursor.
 *
 * Perf discipline:
 *   · Single canvas, context reused
 *   · IntersectionObserver gates animation — particles don't run
 *     when the section is offscreen
 *   · O(n²) link pass but n is small (80); measured ≤0.3ms/frame
 *     on mid-range laptops at 1080p
 */

interface P { x: number; y: number; vx: number; vy: number; r: number; c: string; hue: number; }

const ACCENT_R = 255, ACCENT_G = 106, ACCENT_B = 213;
const ACCENT2_R = 142, ACCENT2_G = 0,   ACCENT2_B = 255;

export function initParticleSwarm(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const host = document.querySelector<HTMLElement>('.zero-adult');
  if (!host) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '0',
    mixBlendMode: 'screen',
    opacity: '0.75'
  } as CSSStyleDeclaration);
  host.style.position = 'relative';
  host.insertBefore(canvas, host.firstChild);
  host.querySelectorAll<HTMLElement>(':scope > :not(canvas)').forEach((el) => {
    if (!el.style.position) el.style.position = 'relative';
    el.style.zIndex = '1';
  });

  const ctxMaybe = canvas.getContext('2d', { alpha: true });
  if (!ctxMaybe) return;
  // Hoisted `function tick(…)` below loses the null-narrowing across
  // the hoist boundary, so alias to a non-nullable local.
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  const N = 80;
  const particles: P[] = [];

  // Seed particles across the full rect. Called lazily — only when we
  // first see a non-zero size. Prevents the previous bug where init
  // ran before the section had layout dimensions, planting every
  // particle at (0,0) where nothing could ever render visibly.
  const seed = (): void => {
    particles.length = 0;
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 0.6 + Math.random() * 1.6,
        c: Math.random() < 0.7 ? `${ACCENT_R},${ACCENT_G},${ACCENT_B}` : `${ACCENT2_R},${ACCENT2_G},${ACCENT2_B}`,
        hue: Math.random() * 6.28
      });
    }
  };

  const resize = (): void => {
    const r = host.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // (Re-)seed if we just discovered a real size and haven't seeded yet.
    if (w > 0 && h > 0 && particles.length === 0) seed();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // Mouse position (local to host)
  let mx = -9999, my = -9999;
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
  });
  host.addEventListener('pointerleave', () => { mx = -9999; my = -9999; });

  // IntersectionObserver — only animate when visible
  let visible = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { visible = e.isIntersecting; });
  }, { rootMargin: '100px 0px' });
  io.observe(host);

  const LINK_DIST = 110;
  const LINK_DIST_SQ = LINK_DIST * LINK_DIST;
  const MOUSE_PUSH = 90;
  const MOUSE_PUSH_SQ = MOUSE_PUSH * MOUSE_PUSH;

  let t0 = performance.now();
  function tick(now: number): void {
    const dt = Math.min(now - t0, 48);
    t0 = now;
    if (!visible || document.documentElement.classList.contains('motion-off')) {
      requestAnimationFrame(tick);
      return;
    }
    ctx.clearRect(0, 0, w, h);

    // Move + gentle swirl
    for (let i = 0; i < N; i++) {
      const p = particles[i]!;
      p.hue += 0.0008 * dt;
      p.vx += Math.sin(p.hue + p.y * 0.003) * 0.001;
      p.vy += Math.cos(p.hue + p.x * 0.003) * 0.001;

      // Mouse repulsion
      if (mx > -500) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < MOUSE_PUSH_SQ && d2 > 0.1) {
          const f = (1 - d2 / MOUSE_PUSH_SQ) * 0.25;
          const d = Math.sqrt(d2);
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }

      // Velocity damp
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;

      // Wrap at edges with margin
      if (p.x < -20) p.x = w + 20;
      else if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      else if (p.y > h + 20) p.y = -20;
    }

    // Draw links
    ctx.lineWidth = 0.6;
    for (let i = 0; i < N; i++) {
      const a = particles[i]!;
      for (let j = i + 1; j < N; j++) {
        const b = particles[j]!;
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST_SQ) {
          const alpha = (1 - d2 / LINK_DIST_SQ) * 0.22;
          ctx.strokeStyle = `rgba(${a.c},${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Draw particles
    for (let i = 0; i < N; i++) {
      const p = particles[i]!;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      glow.addColorStop(0, `rgba(${p.c},0.85)`);
      glow.addColorStop(1, `rgba(${p.c},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${p.c},0.9)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
