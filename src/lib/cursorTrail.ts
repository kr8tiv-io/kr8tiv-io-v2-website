/**
 * Cursor trail — soft, quiet, brand-colored.
 *
 * Design intent: a whisper of color behind the pointer, not fireworks.
 * Each pointer-move event emits a small glow particle that drifts
 * slightly and fades. Colors cycle through the accent palette so the
 * trail reads as a "brand breath" rather than a comic-book POW!
 *
 * Constraints honored:
 *   · `pointer: fine` only — no touch devices
 *   · `prefers-reduced-motion` + `html.motion-off` hard-disable
 *   · ≤ 60 active particles (memory bounded + GPU-friendly)
 *   · canvas fade: 0.12 alpha clear per frame = natural trail without ghosting
 *   · additive blend so overlapping dots glow, single dots stay subtle
 *   · skips frames when the tab is hidden (pageVisibility)
 *
 * Integration: call `initCursorTrail()` from the layout's client
 * script. No DOM contract beyond injecting a single <canvas> layer.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  age: number;         // 0..1, 1 = dead
  color: string;       // "255,106,213" (rgb tuple string)
}

// Brand accents, used in the particle color cycle. Pink → purple →
// gold → red. Keep opacities low so the trail never dominates.
const PALETTE: string[] = [
  '255,106,213', // --accent-1 magenta
  '142,0,255',   // --accent-2 purple
  '255,209,102', // --accent-4 gold
  '255,45,74'    // --accent-3 red
];

// Tuned down aggressively after user feedback that the trail was
// loud + leaving "phantom circles" across the viewport (my destination-out
// fade at 0.12 only halves alpha every ~6 frames, so low-alpha ghosts
// lingered for ~60+ frames before reaching sub-pixel invisibility).
// Halved particle count + emit rate + peak alpha, and bumped the fade
// decay so ghosts die in ~200ms not 700ms.
const MAX_PARTICLES = 30;
const EMIT_INTERVAL_MS = 26;
const MIN_MOVE_DIST = 4;
const PARTICLE_LIFE_MS = 320;
const PARTICLE_DRIFT = 0.3;
const FADE_ALPHA = 0.28;              // faster decay, no lingering faint rings
const FULL_CLEAR_EVERY_MS = 1400;     // nuke any residual ghost buildup

export function initCursorTrail(): void {
  if (typeof window === 'undefined') return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  // NOTE: do NOT bail on OS prefers-reduced-motion. The runtime tick
  // already pauses (and the MutationObserver below clears the canvas)
  // whenever `html.motion-off` is set, so the user's explicit toggle
  // is the only thing that disables the trail. Bailing at init meant
  // that toggling motion ON later did nothing — the function had
  // already returned and the canvas was never created.

  // Canvas layer — full viewport, pointer-events none. Sit ABOVE grain
  // (z:2) but BELOW the hero prism's mix-blend stack + the fixed nav.
  // Originally set to 9998 with `mix-blend-mode: screen`, which — even
  // empty — could additively interact with the prism canvas during
  // particle emission and wash out the magenta spectrum. At z:40 it
  // still feels site-wide (covers content) without stacking on top of
  // the prism's screen-blend rendering.
  const canvas = document.createElement('canvas');
  canvas.id = 'cursor-trail';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '40',
    mixBlendMode: 'screen'
  } as CSSStyleDeclaration);
  document.body.appendChild(canvas);

  const ctxMaybe = canvas.getContext('2d', { alpha: true });
  if (!ctxMaybe) return;
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;
  const resize = (): void => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const particles: Particle[] = [];
  let lastEmit = 0;
  let lastEmitX = -1;
  let lastEmitY = -1;
  let paletteIdx = 0;
  let pointerActive = false;

  const onMove = (e: PointerEvent): void => {
    pointerActive = true;
    const now = performance.now();
    if (now - lastEmit < EMIT_INTERVAL_MS) return;
    const dx = e.clientX - lastEmitX;
    const dy = e.clientY - lastEmitY;
    if (lastEmitX >= 0 && Math.hypot(dx, dy) < MIN_MOVE_DIST) return;

    // Velocity-sensitive radius: faster swipes → bigger glow (capped).
    const speed = Math.min(Math.hypot(dx, dy), 40);

    if (particles.length < MAX_PARTICLES) {
      particles.push({
        x: e.clientX,
        y: e.clientY,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -Math.random() * PARTICLE_DRIFT,
        r: 3 + speed * 0.12 + Math.random() * 1.5,  // slightly smaller radii
        age: 0,
        color: PALETTE[paletteIdx++ % PALETTE.length] ?? PALETTE[0]!
      });
    }
    lastEmit = now;
    lastEmitX = e.clientX;
    lastEmitY = e.clientY;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // Hide the trail when the tab is backgrounded so we don't do any
  // drawing work + don't resume with a stale frame.
  let visible = true;
  document.addEventListener('visibilitychange', () => {
    visible = document.visibilityState === 'visible';
  });

  // Motion toggle — listen for the site's html.motion-off flag and
  // pause the entire trail when the user disables motion.
  const motionObserver = new MutationObserver(() => {
    if (document.documentElement.classList.contains('motion-off')) {
      particles.length = 0;
      ctx.clearRect(0, 0, w, h);
    }
  });
  motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  let lastTime = performance.now();
  let lastFullClear = performance.now();
  function tick(now: number): void {
    const dt = Math.min(now - lastTime, 48);   // clamp long frames
    lastTime = now;

    if (!visible || document.documentElement.classList.contains('motion-off')) {
      requestAnimationFrame(tick);
      return;
    }

    // Belt-and-braces ghost-killer: if no new particles and we haven't
    // done a full clear recently, nuke the canvas. This guarantees
    // "phantom circles" can never stay visible after the cursor stops.
    if (particles.length === 0 && now - lastFullClear > FULL_CLEAR_EVERY_MS) {
      ctx.globalCompositeOperation = 'copy';
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, w, h);
      lastFullClear = now;
      requestAnimationFrame(tick);
      return;
    }

    // Soft fade per frame — keeps the short trail feel while ensuring
    // no lingering ghosts (FADE_ALPHA is now 0.28 = ~28% alpha wiped
    // per frame; a particle reaches sub-pixel invisibility within ~8
    // frames / 130ms instead of the old 40+ frames).
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${FADE_ALPHA})`;
    ctx.fillRect(0, 0, w, h);

    // Draw particles additively so overlap glows, single dots stay quiet.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      p.age += dt / PARTICLE_LIFE_MS;
      if (p.age >= 1) { particles.splice(i, 1); continue; }
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.01; // slight upward curl

      const a = (1 - p.age) ** 2;                // ease-in fade
      const r = p.r * (1 + p.age * 0.6);         // expand as it fades

      // Radial gradient for a soft glow, not a hard circle. Peak alpha
      // halved (0.9 → 0.5) so individual particles read as whispers.
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4);
      g.addColorStop(0, `rgba(${p.color},${(a * 0.5).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(${p.color},${(a * 0.18).toFixed(3)})`);
      g.addColorStop(1, `rgba(${p.color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset the full-clear timer whenever new particles are present.
    if (particles.length > 0) lastFullClear = now;

    // Idle decay — if no pointer input for a while, clear queue
    if (pointerActive && particles.length === 0) pointerActive = false;

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
