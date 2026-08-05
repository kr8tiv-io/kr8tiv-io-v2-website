/**
 * Lazy-autoplay for non-hero videos.
 *
 * `preload="none"` + `autoplay` seems contradictory, but here's the
 * trick: the browser won't fetch the video until we actually call
 * .load() or .play(). We gate that behind IntersectionObserver so
 * service panel / work card videos only start downloading when they
 * approach the viewport. Massively reduces initial bandwidth on cold
 * page loads (was 12 services * ~1 MB + 4 work = ~16 MB pre-fetched
 * before user could even see the hero).
 *
 * Videos already in view on first paint (only the hero) still work
 * normally because the hero has preload="auto".
 *
 * Motion policy: this site deliberately keeps motion ON by default even
 * for OS-level `prefers-reduced-motion` users (see motionToggle.ts) —
 * the visible toggle is the escape hatch. But that escape hatch used to
 * leak: flipping motion off stopped the GSAP/WebGL layers while a dozen
 * looping background videos kept right on playing, which is most of the
 * motion on the page. Now `html.motion-off` parks every decorative
 * video on its poster frame, and un-toggling brings them back live.
 */
import { motionEffectsDisabled } from '@lib/devicePolicy';

/** Park a video on its poster without discarding buffered data. */
function park(v: HTMLVideoElement): void {
  if (!v.paused) v.pause();
  // Rewind so the frozen frame matches the poster rather than a random
  // mid-loop frame — a stopped video mid-motion reads as a broken embed.
  try { v.currentTime = 0; } catch { /* not seekable yet — harmless */ }
}

export function initLazyVideos(): void {
  const videos = document.querySelectorAll<HTMLVideoElement>('video[preload="none"]');
  if (!videos.length || !('IntersectionObserver' in window)) {
    // Fallback: just play them all (unless motion is off).
    if (!motionEffectsDisabled()) {
      videos.forEach((v) => { v.load(); v.play().catch(() => {}); });
    }
    return;
  }
  // Data-saver users get posters only — the video still loads (and
  // plays) the moment its section is actually on screen, but we skip
  // the ahead-of-time prefetch margin.
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection?.saveData === true;
  // 200px of lookahead meant a phone scrolling at normal speed reached
  // a section before its video had bytes — the box sat on its poster
  // (previously: sat blank) for seconds. 900px starts the fetch
  // roughly a full viewport-and-a-half early, so by the time the
  // section scrolls in, the (now much smaller) file is usually ready.
  const margin = saveData ? '0px' : '900px 0px 900px 0px';
  // Remember what's on screen so a motion re-enable can restart exactly
  // the videos the user is currently looking at — not all twenty.
  const onScreen = new Set<HTMLVideoElement>();

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const v = entry.target as HTMLVideoElement;
      if (entry.isIntersecting) {
        onScreen.add(v);
        if (motionEffectsDisabled()) { park(v); return; }
        if (v.readyState < 2) v.load();
        v.play().catch(() => {});
      } else {
        onScreen.delete(v);
        // Pause off-screen videos to save GPU + battery.
        if (!v.paused) v.pause();
      }
    });
  }, { rootMargin: margin, threshold: 0 });
  videos.forEach((v) => io.observe(v));

  // React to the motion toggle live. motionToggle.ts flips a class on
  // <html>, so a class-filtered MutationObserver is the cheapest hook
  // and needs no event contract between the two modules.
  const html = document.documentElement;
  let wasOff = motionEffectsDisabled();
  new MutationObserver(() => {
    const off = motionEffectsDisabled();
    if (off === wasOff) return;
    wasOff = off;
    if (off) {
      videos.forEach(park);
    } else {
      onScreen.forEach((v) => {
        if (v.readyState < 2) v.load();
        v.play().catch(() => {});
      });
    }
  }).observe(html, { attributes: true, attributeFilter: ['class'] });
}
