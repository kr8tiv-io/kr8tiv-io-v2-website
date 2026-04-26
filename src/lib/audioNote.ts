/**
 * Audio-reactive music note pulse.
 *
 * Reads from KR8AUDIO's getLevel (ported to a self-contained analyser
 * setup below). While the track plays, the reveal-cue note scales up
 * and its glow intensifies with low-frequency level. Low-pass
 * smoothed so it reads as a breath, not a jitter.
 */
interface KR8Audio {
  ac: AudioContext;
  analyser: AnalyserNode | null;
  getLevel: () => number;
}

let audio: KR8Audio | null = null;

export function initMusic(): KR8Audio | null {
  const btn = document.getElementById('music-btn');
  const note = document.getElementById('music-note');
  if (!btn) return null;

  const audioEl = document.createElement('audio');
  audioEl.src = '/kr8tiv-assets/kr8tiv-music.mp3';
  audioEl.loop = true;
  audioEl.crossOrigin = 'anonymous';
  audioEl.preload = 'auto';
  audioEl.volume = 0;
  document.body.appendChild(audioEl);

  let on = false;
  let ac: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;

  const setupAudioContext = (): void => {
    if (ac) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ac = new AC();
    const src = ac.createMediaElementSource(audioEl);
    const master = ac.createGain();
    master.gain.value = 1;
    analyser = ac.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    analyser.connect(master);
    master.connect(ac.destination);
  };

  btn.addEventListener('click', () => {
    setupAudioContext();
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    if (on) {
      audioEl.pause();
      btn.classList.remove('on');
      note?.classList.remove('playing');
      on = false;
    } else {
      audioEl.play().catch(() => {});
      audioEl.volume = 0.35;
      btn.classList.add('on');
      note?.classList.add('playing');
      on = true;
    }
  });

  // Click on the note itself also triggers play.
  note?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); btn.click(); });

  const getLevel = (): number => {
    if (!analyser) return 0;
    const d = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(d);
    let sum = 0;
    const lowEnd = Math.floor(d.length * 0.3);
    for (let i = 0; i < lowEnd; i++) sum += d[i] ?? 0;
    return sum / (lowEnd * 255);
  };

  audio = { ac: ac as unknown as AudioContext, analyser, getLevel };
  (window as unknown as { KR8AUDIO: KR8Audio }).KR8AUDIO = audio;
  return audio;
}

export function initAudioReactiveNote(): void {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const note = document.getElementById('music-note');
  if (!note) return;
  let lastLv = 0;
  function tick(): void {
    const lv = (window as unknown as { KR8AUDIO?: KR8Audio }).KR8AUDIO?.getLevel() ?? 0;
    lastLv = lastLv * 0.78 + lv * 0.22;
    if (lastLv > 0.015) {
      const scale = 1 + Math.min(lastLv * 0.7, 0.35);
      const s1 = 8 + lastLv * 22;
      const s2 = 18 + lastLv * 40;
      (note as HTMLElement).style.transform = `scale(${scale.toFixed(3)})`;
      (note as HTMLElement).style.filter =
        `drop-shadow(0 0 ${s1.toFixed(0)}px rgba(255,120,140,${(0.7 + lastLv * 0.25).toFixed(2)}))` +
        ` drop-shadow(0 0 ${s2.toFixed(0)}px rgba(255,45,74,${(0.45 + lastLv * 0.35).toFixed(2)}))`;
    } else if ((note as HTMLElement).style.transform) {
      (note as HTMLElement).style.transform = '';
      (note as HTMLElement).style.filter = '';
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
