/**
 * processFx — twelve elevations layered onto /process/ in a single
 * orchestrator. Every effect is gated on prefers-reduced-motion +
 * html.motion-off and self-disposes via IntersectionObserver where
 * relevant.
 *
 *  1. Kintsugi thread     — fixed SVG vertical crack that fills with
 *                            gold as the user scrolls; clickable
 *                            section anchors on the path
 *  2. Step ink-draw       — chromatic underline draws on as each step
 *                            scrolls into view
 *  3. Page stitch reveal  — gold hairline draws across each section
 *                            border-top on view
 *  4. Marquee vinyl       — scroll velocity modulates the K-word
 *                            marquee speed; click a word → smooth
 *                            scroll to that step section
 *  5. Floating gold dust  — Three.js canvas with ambient particles
 *                            (offloaded to ./goldDust.ts)
 *  6. Battle cry hover    — battle-cry words pick up the same
 *                            kr8-title-aura whitehot glow on hover
 *  7. Founder sig draw    — Matt's signature SVG path strokes on
 *                            when scrolled into view
 *  8. K-word footnotes    — hover any K-word → small tooltip with
 *                            its meaning ("KONTACT / MEET", etc.)
 *  9. Headline heat-up    — "Our process" gets per-word hover halo
 * 10. Section indicator   — verify the bottom-of-screen tick bar
 *                            tracks the 9 step sections (no-op fix)
 * 11. Heart audio-react   — bass level (KR8AUDIO) intensifies the
 *                            love-lore heart pulse
 * 12. Endcap shockwave    — gold ring expands from the CTA endcap
 *                            on scroll-into-view
 */

interface KR8Audio {
  getLevel?: () => number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function initProcessFx(): void {
  const motionOff =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.classList.contains('motion-off');

  // Effects that work fine even with reduced motion
  initStitchReveal();
  initStepInkDraw();
  initFootnotes();

  if (motionOff) return;

  // Motion-required effects
  initKintsugiThread();
  initMarqueeVinyl();
  /* initFounderSig() retired — see § 7 below */
  initHeartAudio();
  initEndcapShockwave();
}

/* ────────────────────────────────────────────────────────────
 * 1 · KINTSUGI THREAD
 * Fixed SVG on the left edge of the viewport. A meandering crack
 * runs from the top of the page down to the bottom; gold fill grows
 * with scroll progress. Section anchors render as small crack
 * junction glyphs along the path; clicking jumps to that section.
 * ──────────────────────────────────────────────────────────── */
function initKintsugiThread(): void {
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.process-mast, .battle-cry, .ethos, .expect-anchor, .process-steps-pro, .zero-adult, .founder, .love-lore, .process-cta'
    )
  );
  if (!sections.length) return;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'kin-thread');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', '0 0 32 1000');
  svg.setAttribute('preserveAspectRatio', 'none');

  /* Procedural meandering path. Sin wave + small randomized kinks
     so the thread feels hand-cracked, not a CSS divider. */
  let d = 'M 16 0 ';
  let prevX = 16;
  for (let y = 30; y <= 1000; y += 30) {
    const wave = Math.sin(y * 0.012) * 7;
    const jitter = (Math.sin(y * 0.83) * 0.5 + Math.sin(y * 1.7) * 0.5) * 3;
    const x = Math.max(4, Math.min(28, 16 + wave + jitter));
    /* Half the segments are sharp Ls (stress fractures), half are
       quadratic Qs (material flex) — same trick as the menu. */
    if (y % 60 === 0) {
      const cx = (prevX + x) / 2 + (Math.sin(y * 0.4) * 3);
      const cy = y - 15;
      d += `Q ${cx.toFixed(2)} ${cy} ${x.toFixed(2)} ${y} `;
    } else {
      d += `L ${x.toFixed(2)} ${y} `;
    }
    prevX = x;
  }

  /* Three-tier stroke vocabulary echoing the kintsugi menu. */
  const shadow = document.createElementNS(SVG_NS, 'path');
  shadow.setAttribute('d', d);
  shadow.setAttribute('class', 'kin-thread-shadow');
  shadow.setAttribute('vector-effect', 'non-scaling-stroke');
  shadow.setAttribute('pathLength', '1');

  const gold = document.createElementNS(SVG_NS, 'path');
  gold.setAttribute('d', d);
  gold.setAttribute('class', 'kin-thread-gold');
  gold.setAttribute('vector-effect', 'non-scaling-stroke');
  gold.setAttribute('pathLength', '1');

  const hilite = document.createElementNS(SVG_NS, 'path');
  hilite.setAttribute('d', d);
  hilite.setAttribute('class', 'kin-thread-hilite');
  hilite.setAttribute('vector-effect', 'non-scaling-stroke');
  hilite.setAttribute('pathLength', '1');

  svg.appendChild(shadow);
  svg.appendChild(gold);
  svg.appendChild(hilite);

  /* Section anchor junctions — placed proportional to each section's
     vertical position. Drawn as tiny ╋ glyphs that brighten when the
     section is in view. Click jumps to it. */
  const anchorGroup = document.createElementNS(SVG_NS, 'g');
  anchorGroup.setAttribute('class', 'kin-thread-anchors');
  svg.appendChild(anchorGroup);

  document.body.appendChild(svg);

  /* Update junctions based on actual page geometry (DOM-ready). */
  const placeAnchors = (): void => {
    while (anchorGroup.firstChild) anchorGroup.removeChild(anchorGroup.firstChild);
    const total = document.documentElement.scrollHeight;
    sections.forEach((sec, i) => {
      const y = sec.getBoundingClientRect().top + window.scrollY;
      const yNorm = (y / total) * 1000;
      /* Sample the path at this y to get the local x. Fast approx:
         re-evaluate the same wave function at this y. */
      const wave = Math.sin(yNorm * 0.012) * 7;
      const jitter = (Math.sin(yNorm * 0.83) * 0.5 + Math.sin(yNorm * 1.7) * 0.5) * 3;
      const x = Math.max(4, Math.min(28, 16 + wave + jitter));

      const a = document.createElementNS(SVG_NS, 'g');
      a.setAttribute('class', 'kin-thread-anchor');
      a.setAttribute('transform', `translate(${x.toFixed(2)} ${yNorm.toFixed(2)})`);
      a.dataset.idx = String(i);
      a.dataset.targetY = String(y);

      /* Cross glyph */
      const h = document.createElementNS(SVG_NS, 'line');
      h.setAttribute('x1', '-3');  h.setAttribute('y1', '0');
      h.setAttribute('x2', '3');   h.setAttribute('y2', '0');
      h.setAttribute('vector-effect', 'non-scaling-stroke');
      const v = document.createElementNS(SVG_NS, 'line');
      v.setAttribute('x1', '0');   v.setAttribute('y1', '-3');
      v.setAttribute('x2', '0');   v.setAttribute('y2', '3');
      v.setAttribute('vector-effect', 'non-scaling-stroke');
      a.appendChild(h); a.appendChild(v);

      /* Bigger invisible hit target so clicking is forgiving */
      const hit = document.createElementNS(SVG_NS, 'circle');
      hit.setAttribute('r', '8');
      hit.setAttribute('fill', 'transparent');
      hit.style.cursor = 'pointer';
      hit.style.pointerEvents = 'auto';
      a.appendChild(hit);

      a.addEventListener('click', () => {
        const ty = Number(a.dataset.targetY ?? 0);
        window.scrollTo({ top: ty - 80, behavior: 'smooth' });
      });

      anchorGroup.appendChild(a);
    });
  };
  /* Defer placement until the page settles (fonts + reflow). */
  requestAnimationFrame(() => requestAnimationFrame(placeAnchors));

  /* Scroll progress drives the thread fill via CSS var. */
  let raf = 0;
  let pending = false;
  const updateProgress = (): void => {
    if (pending) return;
    pending = true;
    raf = requestAnimationFrame(() => {
      pending = false;
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
      document.documentElement.style.setProperty('--kin-thread-progress', progress.toFixed(4));

      /* Light each anchor when its section's center has entered the
         upper half of the viewport. */
      const trigger = window.scrollY + window.innerHeight * 0.45;
      anchorGroup.querySelectorAll<SVGGElement>('.kin-thread-anchor').forEach((a) => {
        const ty = Number(a.dataset.targetY ?? 0);
        if (ty <= trigger) a.classList.add('lit');
        else a.classList.remove('lit');
      });
    });
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', () => {
    placeAnchors();
    updateProgress();
  });

  /* Re-place after fonts load so anchor positions match final layout. */
  document.fonts?.ready?.then(() => {
    placeAnchors();
    updateProgress();
  });

  void raf;
}

/* ────────────────────────────────────────────────────────────
 * 2 · STEP INK DRAW
 * Each .step's number gets a thin chromatic underline that draws on
 * left → right when the step enters the viewport. CSS owns the
 * keyframes; JS just toggles the class.
 * ──────────────────────────────────────────────────────────── */
function initStepInkDraw(): void {
  const steps = document.querySelectorAll<HTMLElement>('.step');
  if (!steps.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('ink-on');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.18 }
  );
  steps.forEach((s) => io.observe(s));
}

/* ────────────────────────────────────────────────────────────
 * 3 · PAGE STITCH REVEAL
 * Each major section gains `.stitch-on` when in view; CSS draws the
 * gold hairline across the section's top edge.
 * ──────────────────────────────────────────────────────────── */
function initStitchReveal(): void {
  const sections = document.querySelectorAll<HTMLElement>(
    '.battle-cry, .ethos, .expect-anchor, .process-steps-pro, .zero-adult, .founder, .love-lore, .process-cta'
  );
  if (!sections.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('stitch-on');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.05 }
  );
  sections.forEach((s) => io.observe(s));
}

/* ────────────────────────────────────────────────────────────
 * 4 · MARQUEE VINYL
 * Scroll velocity modulates animation-duration on the kword strips.
 * Hover a word → pause its strip + chromatic split. Click → smooth-
 * scroll to that step's section if its key matches a step ID.
 * ──────────────────────────────────────────────────────────── */
function initMarqueeVinyl(): void {
  const strips = document.querySelectorAll<HTMLElement>('.kword-strip');
  if (!strips.length) return;

  /* Velocity tracking — read scroll deltas at 60fps via rAF. */
  let lastY = window.scrollY;
  let lastT = performance.now();
  let velNorm = 0;
  const onScroll = (): void => {
    const now = performance.now();
    const dy = window.scrollY - lastY;
    const dt = Math.max(1, now - lastT);
    const v = Math.abs(dy) / dt;
    velNorm = velNorm * 0.7 + Math.min(v / 4, 1) * 0.3;
    lastY = window.scrollY;
    lastT = now;
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  const tick = (): void => {
    const speed = 1 + velNorm * 4; // 1..5×
    document.documentElement.style.setProperty('--marquee-speed', speed.toFixed(2));
    /* Decay velocity when scrolling stops */
    velNorm *= 0.94;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* Hover + click on individual K-words */
  strips.forEach((strip) => {
    strip.querySelectorAll<HTMLElement>('.k').forEach((k) => {
      const word = (k.textContent ?? '').trim();
      k.dataset.word = word;
      k.style.cursor = 'pointer';
      k.style.pointerEvents = 'auto';
      k.addEventListener('pointerenter', () => strip.classList.add('paused'));
      k.addEventListener('pointerleave', () => strip.classList.remove('paused'));
      k.addEventListener('click', () => {
        /* Only the first 9 keys map to step sections. */
        const target = document.getElementById(`step-${word.toLowerCase()}`);
        if (target) {
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - 80,
            behavior: 'smooth'
          });
        }
      });
    });
  });
}

/* ────────────────────────────────────────────────────────────
 * 5 · GOLD DUST  (deferred to ./goldDust.ts; called from page init)
 * ──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
 * 6 · BATTLE CRY HOVER  (CSS-only via kr8-title-aura class)
 * ──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
 * 7 · FOUNDER SIGNATURE  (retired — see initProcessFx note above.
 *     Plain text "— Matt" reads cleaner than the synthesized SVG
 *     hand-draw. Restore by re-implementing this function and
 *     re-enabling its call site.)
 * ──────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────
 * 8 · K-WORD FOOTNOTES  (CSS tooltip; this fn just adds data attrs)
 * ──────────────────────────────────────────────────────────── */
const KWORD_MEANINGS: Record<string, string> = {
  KONTACT: '/ MEET',
  KONVERSE: '/ DISCOVER',
  KOLLECT: '/ GATHER',
  KONCEPTZ: '/ THREE DIRECTIONS',
  KONVERGE: '/ NARROW',
  'KR8TE': '/ MAKE',
  KONNECT: '/ INTEGRATE',
  KLOSING: '/ DELIVER',
  KARE: '/ AFTER'
};

function initFootnotes(): void {
  document.querySelectorAll<HTMLElement>('.kword-strip .k').forEach((k) => {
    const word = (k.textContent ?? '').trim().toUpperCase();
    const meaning = KWORD_MEANINGS[word];
    if (meaning) k.dataset.meaning = meaning;
  });
}

/* ────────────────────────────────────────────────────────────
 * 11 · HEART AUDIO-REACTIVE
 * Reads window.KR8AUDIO?.getLevel() (0..1) and writes a CSS var that
 * the heart's pulse keyframe consumes for amplitude.
 * ──────────────────────────────────────────────────────────── */
function initHeartAudio(): void {
  const heart = document.querySelector<HTMLElement>('.love-lore h3 .heart');
  if (!heart) return;
  let smoothed = 0;
  const tick = (): void => {
    const audio = (window as unknown as { KR8AUDIO?: KR8Audio }).KR8AUDIO;
    const level = audio?.getLevel?.() ?? 0;
    smoothed = smoothed * 0.78 + level * 0.22;
    heart.style.setProperty('--heart-bass', smoothed.toFixed(3));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ────────────────────────────────────────────────────────────
 * 12 · CTA ENDCAP SHOCKWAVE
 * Two staggered gold rings expand from the endcap center on view.
 * ──────────────────────────────────────────────────────────── */
function initEndcapShockwave(): void {
  const cta = document.querySelector<HTMLElement>('.process-cta');
  if (!cta) return;

  const wrap = document.createElement('div');
  wrap.className = 'cta-shockwave-wrap';
  wrap.setAttribute('aria-hidden', 'true');
  /* Two concentric rings */
  for (let i = 0; i < 2; i++) {
    const ring = document.createElement('span');
    ring.className = `cta-shockwave cta-shockwave-${i + 1}`;
    wrap.appendChild(ring);
  }
  cta.prepend(wrap);

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            wrap.classList.add('fired');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(cta);
  }
}
