/**
 * Menu Lab · Concept 02 — Oracle ⌘K command palette.
 *
 * Fuzzy-matches across a small intent graph:
 *   · Pages          (process, start, home, book)
 *   · Actions        (toggle theme, toggle music, open white light)
 *   · Copy tokens    (crypto, AI, founder, pricing)
 *
 * Bindings:
 *   · ⌘K / Ctrl+K / `/`   open
 *   · ↑/↓                 navigate
 *   · Enter               execute selection
 *   · Esc                 close
 */

interface Cmd {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  keywords: string[];
  shortcut?: string[];
  action: () => void;
}

export function initOracle(): void {
  const popover = document.getElementById('ml-oracle-popover') as HTMLElement | null;
  const trigger = document.getElementById('ml-oracle-trigger') as HTMLButtonElement | null;
  const input = document.getElementById('ml-oracle-input') as HTMLInputElement | null;
  const list = document.getElementById('ml-oracle-list') as HTMLUListElement | null;
  if (!popover || !input || !list) return;

  const cmds: Cmd[] = [
    { id: 'home',    title: 'Home',            subtitle: 'Back to splash / prism',   icon: '◇', keywords: ['home','splash','hero','prism'], action: () => (location.href = '/') },
    { id: 'process', title: 'Our process',     subtitle: '9 steps · KONTACT → KARE', icon: '◊', keywords: ['process','how','steps','method','playbook'], action: () => (location.href = '/process/') },
    { id: 'start',   title: 'Start a project', subtitle: '10-section intake (~8 min)', icon: '✎', keywords: ['start','intake','form','brief','project'], action: () => (location.href = '/start/') },
    { id: 'book',    title: 'Book a call',     subtitle: 'Calendly · free 30 min · no obligation', icon: '☏', keywords: ['book','calendly','call','talk','chat','meeting'], action: () => window.open('https://calendly.com/kr8tiv', '_blank', 'noopener') },
    { id: 'ai',      title: 'AI systems for business', subtitle: 'Marketing · agents · internal tools', icon: '❁', keywords: ['ai','automation','marketing','agent','gpt','llm'], action: () => (location.href = '/process/#ai') },
    { id: 'email',   title: 'Email Matt',      subtitle: 'matt@kr8tiv.io',            icon: '✉', keywords: ['email','matt','contact','say hi'], action: () => (location.href = 'mailto:matt@kr8tiv.io') },
    { id: 'theme',   title: 'Toggle theme',    subtitle: 'Dark ↔ Light',              icon: '☀', keywords: ['theme','dark','light','mode'], shortcut: ['⌘','T'], action: () => (document.getElementById('theme-btn') as HTMLButtonElement | null)?.click() },
    { id: 'music',   title: 'Toggle music',    subtitle: 'Kr8tiv theme · audio-reactive', icon: '♪', keywords: ['music','audio','sound','track','play'], shortcut: ['⌘','M'], action: () => (document.getElementById('music-btn') as HTMLButtonElement | null)?.click() },
    { id: 'motion',  title: 'Toggle motion',   subtitle: 'Respect reduced motion',    icon: '◎', keywords: ['motion','animation','reduce','a11y'], action: () => (document.getElementById('motion-toggle') as HTMLButtonElement | null)?.click() },
    { id: 'white',   title: 'White-light mode',subtitle: 'ASCII dither easter egg',   icon: '◉', keywords: ['white','light','ascii','dither','easter','egg'], shortcut: ['W'], action: () => window.dispatchEvent(new CustomEvent('white-light:toggle')) },
    { id: 'crypto',  title: 'Crypto payments', subtitle: 'BTC · ETH · cryptocurrency',icon: '₿', keywords: ['crypto','bitcoin','ethereum','btc','eth','payment'], action: () => (location.href = '/process/#cta') },
    { id: 'notes',   title: 'Build notes',     subtitle: 'How this site was made',    icon: '§', keywords: ['notes','build','case','study','codrops'], action: () => (location.href = '/build-notes/') }
  ];

  let filtered: Cmd[] = cmds;
  let cursor = 0;

  const render = (): void => {
    list.innerHTML = '';
    filtered.forEach((c, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === cursor));
      li.dataset.id = c.id;
      li.innerHTML = `
        <span class="ico">${c.icon}</span>
        <span class="body"><strong>${c.title}</strong><em>${c.subtitle}</em></span>
        <span class="shortcut">${(c.shortcut ?? []).map((k) => `<kbd>${k}</kbd>`).join('')}</span>
      `;
      li.addEventListener('click', () => c.action());
      li.addEventListener('mousemove', () => { cursor = i; render(); });
      list.appendChild(li);
    });
  };

  const fuzzy = (q: string): void => {
    const query = q.trim().toLowerCase();
    if (!query) {
      filtered = cmds;
    } else {
      const score = (c: Cmd): number => {
        let s = 0;
        const hay = [c.title, c.subtitle, ...c.keywords].join(' ').toLowerCase();
        if (hay.includes(query)) s += 10;
        // Per-char fuzzy bonus: consecutive matches score more
        let qi = 0;
        for (let i = 0; i < hay.length && qi < query.length; i++) {
          if (hay[i] === query[qi]) { s += 1; qi++; }
        }
        return qi === query.length ? s : 0;
      };
      filtered = cmds
        .map((c) => ({ c, s: score(c) }))
        .filter(({ s }) => s > 0)
        .sort((a, b) => b.s - a.s)
        .map(({ c }) => c);
    }
    cursor = 0;
    render();
  };

  const open = (): void => {
    if (typeof popover.showPopover === 'function') popover.showPopover();
    input.value = '';
    fuzzy('');
    setTimeout(() => input.focus(), 30);
  };
  const close = (): void => {
    if (typeof popover.hidePopover === 'function') popover.hidePopover();
  };

  trigger?.addEventListener('click', open);
  input.addEventListener('input', (e) => fuzzy((e.target as HTMLInputElement).value));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(cursor + 1, filtered.length - 1); render(); scrollCursorIntoView(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(cursor - 1, 0); render(); scrollCursorIntoView(); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[cursor]?.action(); close(); }
    else if (e.key === 'Escape') { close(); }
  });

  const scrollCursorIntoView = (): void => {
    const sel = list.querySelector<HTMLElement>('[aria-selected="true"]');
    sel?.scrollIntoView({ block: 'nearest' });
  };

  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    // Only activate when not typing in a real form field (inside lab page inputs ok)
    const inForm = (e.target as HTMLElement)?.tagName === 'INPUT' && (e.target as HTMLElement).id !== 'ml-oracle-input';
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    else if (e.key === '/' && !inForm && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault(); open();
    }
  });

  render();
}
