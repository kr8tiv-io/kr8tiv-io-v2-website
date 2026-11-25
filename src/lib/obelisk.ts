/**
 * Doctrine obelisk video scroll-scrub.
 *
 * Scrolling through the doctrine section drives video.currentTime
 * forward/backward. Uses scrub:0.5 for GSAP smoothing over scroll
 * jitter. Dedup threshold avoids queueing seeks the decoder can't
 * service in time.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register at module load — Astro's parallel ES-module loading means we
// can't rely on scrollCore.ts having run first.
gsap.registerPlugin(ScrollTrigger);

export function initObelisk(): void {
  const v = document.getElementById('obelisk-vid') as HTMLVideoElement | null;
  if (!v) return;
  try { v.pause(); v.currentTime = 0; } catch {}

  const init = (): void => {
    const d = v.duration;
    if (!d || !isFinite(d)) { setTimeout(init, 150); return; }

    // Prime the decoder so the first scrub isn't cold.
    v.play().then(() => { v.pause(); try { v.currentTime = 0; } catch {} }).catch(() => {});

    // Coalesce seeks behind v.seeking so fast scroll-wheel reversals never
    // cancel in-flight hardware decodes or stutter backward.
    let pendingTime: number | null = null;
    const flushSeek = (): void => {
      if (pendingTime === null || v.seeking) return;
      const next = pendingTime;
      pendingTime = null;
      try { v.currentTime = next; } catch {}
    };
    v.addEventListener('seeked', flushSeek);

    ScrollTrigger.create({
      trigger: '.doctrine',
      start: 'top 90%',
      end: 'center center',
      scrub: 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (v.readyState >= 1 && !isNaN(d)) {
          const t = Math.min(d * self.progress, d - 0.01);
          if (Math.abs(t - v.currentTime) > 0.02) {
            pendingTime = t;
            flushSeek();
          }
        }
      }
    });
  };
  if (v.readyState >= 1) init();
  else v.addEventListener('loadedmetadata', init);
}
