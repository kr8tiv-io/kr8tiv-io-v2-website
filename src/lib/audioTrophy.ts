/**
 * Audio-reactive trophy — the 🏆 on the battle-cry block.
 *
 * Reads `window.KR8AUDIO.getLevel()` (populated by audioNote.ts when
 * the music button is toggled on). Modulates:
 *   · scale — pulses on beat
 *   · rotation — amplifies the existing wobble CSS animation
 *   · drop-shadow — glow intensifies with bass
 *
 * Idle (no music playing): identity. The existing `trophy-wobble` CSS
 * keyframe still runs. So the trophy still feels alive without audio.
 */

interface KR8Audio { getLevel: () => number; }

export function initAudioTrophy(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const trophies = document.querySelectorAll<HTMLElement>('.trophy');
  if (trophies.length === 0) return;

  let smoothed = 0;
  function tick(): void {
    if (document.documentElement.classList.contains('motion-off')) {
      requestAnimationFrame(tick);
      return;
    }
    const lv = (window as unknown as { KR8AUDIO?: KR8Audio }).KR8AUDIO?.getLevel() ?? 0;
    // Low-pass smoothing — 0.82 decay / 0.18 gain = breath, not jitter
    smoothed = smoothed * 0.82 + lv * 0.18;

    if (smoothed > 0.012) {
      const scale = 1 + Math.min(smoothed * 1.4, 0.55);
      const glow = 12 + smoothed * 42;
      const hueShift = smoothed * 28;   // degrees
      trophies.forEach((t) => {
        // Preserve the CSS keyframe wobble by combining transforms:
        // the keyframe is applied via `transform-origin: bottom center`
        // with rotate(); we only layer scale on top via a CSS var.
        t.style.setProperty('--audio-scale', scale.toFixed(3));
        t.style.setProperty('--audio-glow', `${glow.toFixed(0)}px`);
        t.style.setProperty('--audio-hue', `${hueShift.toFixed(1)}deg`);
      });
    } else {
      trophies.forEach((t) => {
        t.style.removeProperty('--audio-scale');
        t.style.removeProperty('--audio-glow');
        t.style.removeProperty('--audio-hue');
      });
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
