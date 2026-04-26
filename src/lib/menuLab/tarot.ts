/**
 * Menu Lab · Concept 10 — Tarot Deck.
 *
 * Hover a card: it rises from the fan + lifts toward the viewer.
 * Click: card flips 180° on the y-axis (with perspective on the deck
 * parent). The flipped face is the destination "card back" — in real
 * production this would start the View Transition to the target page.
 * Here we just send a nav intent and log it.
 */

export function initTarot(selector = '.ml-tarot'): void {
  const host = document.querySelector<HTMLElement>(selector);
  if (!host) return;
  const cards = host.querySelectorAll<HTMLElement>('.tarot-card');

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const target = card.dataset.target ?? '/';
      // Flip animation
      card.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1), box-shadow .6s';
      const currentTransform = getComputedStyle(card).transform;
      card.style.transform = `${currentTransform} rotateY(180deg) scale(1.08)`;
      card.style.boxShadow = '0 40px 120px rgba(255,106,213,.45)';
      setTimeout(() => {
        if (target.startsWith('http')) window.open(target, '_blank', 'noopener');
        else if (target.startsWith('mailto:')) location.href = target;
        else location.href = target;
      }, 420);
    });
  });
}
