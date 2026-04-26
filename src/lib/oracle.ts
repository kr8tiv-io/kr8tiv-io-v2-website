/**
 * Oracle — global command palette for KR8TIV (Hybrid · layer 2/3).
 *
 * Site-wide keyboard-first nav. Bindings:
 *   · ⌘K / Ctrl+K / `/`   — open (disabled while typing in form fields)
 *   · ↑ / ↓               — navigate selection
 *   · Enter               — execute
 *   · Esc                 — close
 *
 * Command graph:
 *   · Pages (process, start, home, book-call, email, notes)
 *   · Actions (toggle theme, toggle music, toggle motion, white-light)
 *   · Intents (AI, crypto, pricing, founder) — deep-link to fragments
 *
 * Fuzzy match scores exact-phrase matches highest, then per-char
 * subsequence matches. Returns only items where every character in
 * the query appears in order in (title + subtitle + keywords).
 *
 * DOM contract: page includes `#oracle-popover` (auto popover), an
 * `#oracle-input` text field inside it, and an `#oracle-list` <ul>.
 * See src/components/OracleOverlay.astro for the template.
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
  const popover = document.getElementById('oracle-popover') as HTMLElement | null;
  const input = document.getElementById('oracle-input') as HTMLInputElement | null;
  const list = document.getElementById('oracle-list') as HTMLUListElement | null;
  if (!popover || !input || !list) return;

  const cmds: Cmd[] = [
    { id: 'home',    title: 'Home',              subtitle: 'Splash · prism hero',              icon: '◇', keywords: ['home','splash','hero','prism','start'], action: () => go('/') },
    { id: 'process', title: 'Our process',       subtitle: '9 steps · KONTACT → KARE',         icon: '◊', keywords: ['process','method','playbook','steps','how we work'], action: () => go('/process/') },
    { id: 'start',   title: 'Start a project',   subtitle: '10-section intake · ~8 min',       icon: '✎', keywords: ['start','intake','brief','form','request'], action: () => go('/start/') },
    { id: 'book',    title: 'Book a call',       subtitle: 'Calendly · free 30 min · no obligation', icon: '☏', keywords: ['book','calendly','call','meet','talk','chat','consult'], action: () => openExt('https://calendly.com/kr8tiv') },
    { id: 'ai',      title: 'AI systems for business', subtitle: 'Marketing · agents · internal tools', icon: '❁', keywords: ['ai','automation','marketing','agent','gpt','llm','copilot'], action: () => go('/process/#ai') },
    { id: 'email',   title: 'Email Matt',        subtitle: 'matt@kr8tiv.io',                   icon: '✉', keywords: ['email','matt','contact','say hi','hello'], action: () => (location.href = 'mailto:matt@kr8tiv.io') },
    { id: 'work',    title: 'Work + case studies', subtitle: 'Selected output',                icon: '▤', keywords: ['work','portfolio','projects','case','studies'], action: () => go('/#work') },
    { id: 'why',     title: 'Why KR8TIV',        subtitle: 'Founder · ethos · proof',          icon: '✸', keywords: ['why','about','founder','ethos','matt','manifesto'], action: () => go('/#why') },
    { id: 'crypto',  title: 'Crypto payments',   subtitle: 'BTC · ETH · cryptocurrency · fiat', icon: '₿', keywords: ['crypto','bitcoin','ethereum','btc','eth','payment','pricing','cost','rate'], action: () => go('/process/#cta') },
    { id: 'notes',   title: 'Build notes',       subtitle: 'How this site was built',          icon: '§', keywords: ['notes','build','case','study','codrops','tech'], action: () => go('/build-notes/') },
    { id: 'theme',   title: 'Toggle theme',      subtitle: 'Dark ↔ light',                     icon: '☀', keywords: ['theme','dark','light','mode','color'], shortcut: ['T'], action: () => clickById('theme-btn') },
    { id: 'music',   title: 'Toggle music',      subtitle: 'KR8TIV theme · audio-reactive',    icon: '♪', keywords: ['music','audio','sound','track','play','mute'], shortcut: ['M'], action: () => clickById('music-btn') },
    { id: 'motion',  title: 'Toggle motion',     subtitle: 'Respect reduced motion',           icon: '◎', keywords: ['motion','animation','reduce','a11y','accessible'], action: () => clickById('motion-toggle') },
    { id: 'white',   title: 'White-light mode',  subtitle: 'ASCII-dither easter egg',          icon: '◉', keywords: ['white','light','ascii','dither','easter','egg','invert'], shortcut: ['W'], action: () => window.dispatchEvent(new CustomEvent('white-light:toggle')) },
    { id: 'lab',     title: 'Menu lab (dev)',    subtitle: 'Preview of other nav concepts',    icon: '⚗', keywords: ['lab','menu','preview','dev','concepts','experiment'], action: () => go('/menu-lab/') }
  ];

  // --- helpers ---
  function go(href: string): void { location.href = href; }
  function openExt(href: string): void { window.open(href, '_blank', 'noopener,noreferrer'); }
  function clickById(id: string): void {
    const btn = document.getElementById(id);
    (btn as HTMLButtonElement | null)?.click();
  }

  let filtered: Cmd[] = cmds;
  let cursor = 0;

  const render = (): void => {
    list.innerHTML = '';
    if (filtered.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'oracle-empty';
      empty.textContent = 'Nothing matches. Try "book", "ai", "process"…';
      list.appendChild(empty);
      return;
    }
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
      li.addEventListener('click', () => { c.action(); close(); });
      li.addEventListener('mousemove', () => { if (cursor !== i) { cursor = i; render(); } });
      list.appendChild(li);
    });
  };

  const fuzzy = (q: string): void => {
    const query = q.trim().toLowerCase();
    if (!query) {
      filtered = cmds;
    } else {
      const score = (c: Cmd): number => {
        const hay = [c.title, c.subtitle, ...c.keywords].join(' ').toLowerCase();
        let s = 0;
        if (hay.includes(query)) s += 20;
        // Subsequence match — all chars appear in order.
        let qi = 0;
        let streak = 0;
        for (let i = 0; i < hay.length && qi < query.length; i++) {
          if (hay[i] === query[qi]) {
            s += 1 + streak;
            streak += 0.25;
            qi++;
          } else {
            streak = 0;
          }
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
    // Also close Kintsugi if it's open — only one overlay at a time.
    window.dispatchEvent(new CustomEvent('kintsugi:close'));
    if (typeof popover.showPopover === 'function') {
      try { popover.showPopover(); } catch { /* already open */ }
    }
    input.value = '';
    fuzzy('');
    setTimeout(() => input.focus(), 30);
  };
  const close = (): void => {
    if (typeof popover.hidePopover === 'function') {
      try { popover.hidePopover(); } catch { /* already closed */ }
    }
  };

  input.addEventListener('input', (e) => fuzzy((e.target as HTMLInputElement).value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cursor = Math.min(cursor + 1, Math.max(0, filtered.length - 1));
      render();
      scrollCursorIntoView();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cursor = Math.max(cursor - 1, 0);
      render();
      scrollCursorIntoView();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[cursor]?.action();
      close();
    } else if (e.key === 'Escape') {
      close();
    }
  });

  const scrollCursorIntoView = (): void => {
    const sel = list.querySelector<HTMLElement>('[aria-selected="true"]');
    sel?.scrollIntoView({ block: 'nearest' });
  };

  // Global hotkeys — skip if user is in a form field
  const isTyping = (t: EventTarget | null): boolean => {
    const el = t as HTMLElement | null;
    if (!el) return false;
    if (el === input) return true; // already in the Oracle input, keep it open
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return false;
  };

  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      open();
      return;
    }
    if (e.key === '/' && !isTyping(e.target) && !mod) {
      e.preventDefault();
      open();
      return;
    }
  });

  // External triggers (nav buttons, kintsugi, etc.)
  window.addEventListener('oracle:open', open);
  window.addEventListener('oracle:close', close);
  document.querySelectorAll<HTMLElement>('[data-oracle-open]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); open(); });
  });

  render();
}
