/**
 * Menu Lab · Concept 03 — Remi AI concierge.
 *
 * A small stepwise decision tree wrapped in a chat-card UI. Keyword
 * matching on free text routes to the same leaves as the clickable
 * options. Not a real LLM — intentionally cheap, reliable, and easy
 * to swap for one later.
 */

interface Step {
  msg: string;
  options: Array<{ label: string; goto: string }>;
}

const TREE: Record<string, Step> = {
  start: {
    msg: `Hi — I'm <em>Remi</em>, KR8TIV's AI concierge. What brings you here?`,
    options: [
      { label: 'I need a brand or website', goto: 'brand' },
      { label: 'I want to add AI to my business', goto: 'ai' },
      { label: 'Just curious — give me the tour', goto: 'tour' },
      { label: 'I want to talk to a human', goto: 'human' }
    ]
  },
  brand: {
    msg: `Lovely. Is this a <em>new</em> brand or a refresh of an existing one?`,
    options: [
      { label: 'Brand new', goto: 'intake' },
      { label: 'Refresh / rebrand', goto: 'intake' },
      { label: 'Not sure yet', goto: 'call' }
    ]
  },
  ai: {
    msg: `Nice. Which is closest to your situation?`,
    options: [
      { label: 'We want AI-driven marketing / content', goto: 'process-ai' },
      { label: 'Internal tools or customer agents', goto: 'process-ai' },
      { label: 'Not sure — just exploring', goto: 'call' }
    ]
  },
  tour: {
    msg: `Three quick stops:`,
    options: [
      { label: 'Our process (9 steps)', goto: 'process' },
      { label: 'Selected work', goto: 'work' },
      { label: 'Pricing & engagement model', goto: 'process-price' }
    ]
  },
  human: {
    msg: `Easiest thing is a 30-min call — <em>no pitch, no obligation</em>. Which works?`,
    options: [
      { label: 'Book a Calendly slot', goto: 'call' },
      { label: 'Email Matt directly', goto: 'email' }
    ]
  },
  intake: { msg: 'Routing you to the intake form…', options: [{ label: 'Go to /start/', goto: 'nav-start' }] },
  process: { msg: 'Routing you to /process/…', options: [{ label: 'Go to /process/', goto: 'nav-process' }] },
  'process-ai': { msg: 'Routing you to our AI solutions block…', options: [{ label: 'Go to /process/#ai', goto: 'nav-process-ai' }] },
  'process-price': { msg: 'Pricing + split is on the process page.', options: [{ label: 'Go to /process/', goto: 'nav-process' }] },
  work: { msg: 'Routing you to the work section…', options: [{ label: 'Go to /#work', goto: 'nav-work' }] },
  call: { msg: 'Opening Calendly for a no-obligation call…', options: [{ label: 'Open calendly.com/kr8tiv', goto: 'nav-calendly' }] },
  email: { msg: 'Opening your mail client to matt@kr8tiv.io…', options: [{ label: 'Compose email', goto: 'nav-email' }] }
};

const KEYWORDS: Record<string, string> = {
  brand: 'brand', logo: 'brand', website: 'brand', web: 'brand', site: 'brand', identity: 'brand',
  ai: 'ai', automation: 'ai', automate: 'ai', agent: 'ai', gpt: 'ai', llm: 'ai', marketing: 'ai',
  tour: 'tour', curious: 'tour', learn: 'tour', about: 'tour',
  human: 'human', talk: 'human', call: 'call', meeting: 'call', calendly: 'call', book: 'call',
  email: 'email', matt: 'email',
  price: 'process-price', cost: 'process-price', budget: 'process-price', pricing: 'process-price',
  process: 'process', how: 'process', steps: 'process', method: 'process',
  work: 'work', portfolio: 'work'
};

export function initRemi(selector = '.ml-remi'): void {
  const host = document.querySelector<HTMLElement>(selector);
  if (!host) return;
  const bubble = host.querySelector<HTMLElement>('.remi-bubble');
  const optsEl = host.querySelector<HTMLElement>('.remi-opts');
  const textInput = host.querySelector<HTMLInputElement>('.remi-input input');
  const sendBtn = host.querySelector<HTMLButtonElement>('.remi-input button');

  function go(id: string): void {
    // External nav intents — in the real site these would fire;
    // here we route to the actual URL so the demo is navigable.
    if (id === 'nav-start') return void (location.href = '/start/');
    if (id === 'nav-process') return void (location.href = '/process/');
    if (id === 'nav-process-ai') return void (location.href = '/process/#ai');
    if (id === 'nav-work') return void (location.href = '/#work');
    if (id === 'nav-calendly') return void window.open('https://calendly.com/kr8tiv', '_blank', 'noopener');
    if (id === 'nav-email') return void (location.href = 'mailto:matt@kr8tiv.io');

    const step = TREE[id];
    if (!step) return;
    if (bubble) bubble.innerHTML = step.msg;
    if (optsEl) {
      optsEl.innerHTML = '';
      step.options.forEach((o) => {
        const b = document.createElement('button');
        b.textContent = o.label;
        b.addEventListener('click', () => go(o.goto));
        optsEl.appendChild(b);
      });
    }
  }

  function handleText(q: string): void {
    const lowered = q.toLowerCase();
    const hit = Object.keys(KEYWORDS).find((kw) => lowered.includes(kw));
    if (hit) go(KEYWORDS[hit]!);
    else {
      if (bubble) bubble.innerHTML = `Hmm — I don't quite follow. Try <em>book a call</em>, <em>our process</em>, or <em>AI solutions</em>.`;
    }
  }

  sendBtn?.addEventListener('click', () => {
    if (!textInput) return;
    const q = textInput.value.trim();
    if (!q) return;
    handleText(q);
    textInput.value = '';
  });
  textInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendBtn?.click();
  });

  go('start');
}
