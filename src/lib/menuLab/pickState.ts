/**
 * Menu Lab · persistent "I pick this concept" state.
 * Writes to localStorage so a reload keeps the user's choice, and
 * mirrors it into the page header + toolbar.
 */
const KEY = 'kr8tiv-menu-lab-pick';

export function initPickState(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.ml-pick-btn');
  const header = document.getElementById('ml-current');
  const footState = document.getElementById('ml-tb-state');
  const footClear = document.getElementById('ml-tb-clear');

  let current: string | null = null;
  try { current = localStorage.getItem(KEY); } catch { /* noop */ }

  const sync = (): void => {
    buttons.forEach((b) => b.classList.toggle('picked', b.dataset.concept === current));
    if (header) header.textContent = current ? current : 'none yet';
    if (footState) footState.innerHTML = current ? `Current pick: <em>${current}</em>` : 'No pick yet — browse below';
  };

  buttons.forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.concept || '';
      current = current === id ? null : id;
      try {
        if (current) localStorage.setItem(KEY, current);
        else localStorage.removeItem(KEY);
      } catch { /* noop */ }
      sync();
    });
  });
  footClear?.addEventListener('click', () => {
    current = null;
    try { localStorage.removeItem(KEY); } catch { /* noop */ }
    sync();
  });
  sync();
}
