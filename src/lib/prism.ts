/**
 * Mouse-reactive prism bars.
 *
 * 8 CSS gradient bars that tilt/shift/scale based on cursor position.
 * Values lerp for smooth motion. Sets CSS custom properties via
 * inline style; no per-frame style recalculation beyond that.
 */
export function initPrism(): void {
  const barsWrap = document.getElementById('prism-bars');
  const caustic = document.getElementById('prism-caustic');
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!barsWrap || !hero) return;

  const bars = Array.from(barsWrap.children) as HTMLElement[];
  const state = bars.map(() => ({ shift: 0, tilt: 0, scale: 1, bright: 0 }));
  let targetX = 0.5, targetY = 0.5, active = 0;
  let lerpX = 0.5, lerpY = 0.5, lerpA = 0;

  hero.addEventListener('pointermove', (e: PointerEvent) => {
    const r = hero.getBoundingClientRect();
    targetX = (e.clientX - r.left) / r.width;
    targetY = (e.clientY - r.top) / r.height;
    active = 1;
  });
  hero.addEventListener('pointerleave', () => { active = 0; });

  hero.addEventListener('touchmove', (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    const r = hero.getBoundingClientRect();
    targetX = (t.clientX - r.left) / r.width;
    targetY = (t.clientY - r.top) / r.height;
    active = 1;
  }, { passive: true });
  hero.addEventListener('touchend', () => { active = 0; });

  function tick(): void {
    lerpX += (targetX - lerpX) * 0.12;
    lerpY += (targetY - lerpY) * 0.12;
    lerpA += (active - lerpA) * 0.07;
    const N = bars.length;
    const tiltDeg = (lerpY - 0.5) * 6 * lerpA;

    for (let i = 0; i < N; i++) {
      const barCenter = (i + 0.5) / N;
      const dist = Math.abs(barCenter - lerpX);
      const weight = Math.max(0, 1 - dist * 1.8);
      const brightTarget = weight * lerpA;
      const shiftTarget = (lerpX - barCenter) * 22 * lerpA;
      const scaleTarget = 1 + weight * 0.35 * lerpA;

      const s = state[i];
      if (!s) continue;
      s.bright += (brightTarget - s.bright) * 0.15;
      s.shift += (shiftTarget - s.shift) * 0.11;
      s.scale += (scaleTarget - s.scale) * 0.12;
      s.tilt += (tiltDeg - s.tilt) * 0.10;

      const bar = bars[i];
      if (!bar) continue;
      bar.style.setProperty('--shift', s.shift.toFixed(2) + 'px');
      bar.style.setProperty('--tilt', s.tilt.toFixed(2) + 'deg');
      bar.style.setProperty('--scale', s.scale.toFixed(3));
      bar.style.setProperty('--bright', s.bright.toFixed(3));
    }

    if (caustic) {
      caustic.style.setProperty('--cx', (lerpX * 100) + 'vw');
      caustic.style.setProperty('--caustic-op', (lerpA * 0.9).toFixed(3));
      caustic.style.setProperty('--caustic-scale', (0.92 + lerpA * 0.12).toFixed(3));
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    barsWrap.classList.add('drifting');
  }
}
