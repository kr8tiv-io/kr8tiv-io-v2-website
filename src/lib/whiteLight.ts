/**
 * White-light easter egg — footer button + `W` keyboard shortcut.
 * Pure-white flash, quote fade-in, release.
 */
export function initWhiteLight(): void {
  const overlay = document.getElementById('white-light-overlay');
  const text = document.getElementById('white-light-text');
  const btn = document.getElementById('white-light-btn');
  if (!overlay || !text) return;
  let active = false;

  const trigger = (e?: Event): void => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (active) return;
    active = true;
    overlay.classList.remove('release');
    overlay.classList.add('flash');
    // Let the ASCII/dither pass know the flash opened. It will paint a
    // dithered pixel-mask over the white while the quote is in view.
    document.dispatchEvent(new CustomEvent('white-light:open'));
    setTimeout(() => text.classList.add('show'), 380);
    setTimeout(() => {
      text.classList.remove('show');
      overlay.classList.remove('flash');
      overlay.classList.add('release');
      document.dispatchEvent(new CustomEvent('white-light:close'));
      setTimeout(() => {
        overlay.classList.remove('release');
        active = false;
      }, 900);
    }, 1800);
  };

  btn?.addEventListener('click', trigger);
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key !== 'w' && e.key !== 'W') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as Element | null;
    if (t && 'matches' in t && (t as Element).matches('input,textarea,[contenteditable="true"]')) return;
    trigger(e);
  });
}
