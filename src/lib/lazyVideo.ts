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
 */
export function initLazyVideos(): void {
  const videos = document.querySelectorAll<HTMLVideoElement>('video[preload="none"]');
  if (!videos.length || !('IntersectionObserver' in window)) {
    // Fallback: just play them all.
    videos.forEach((v) => { v.load(); v.play().catch(() => {}); });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const v = entry.target as HTMLVideoElement;
      if (entry.isIntersecting) {
        if (v.readyState < 2) v.load();
        v.play().catch(() => {});
      } else {
        // Pause off-screen videos to save GPU + battery.
        if (!v.paused) v.pause();
      }
    });
  }, { rootMargin: '200px 0px 200px 0px', threshold: 0.05 });
  videos.forEach((v) => io.observe(v));
}
