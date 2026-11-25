/**
 * Content data — services + work + variant list.
 * Typed once, imported by Astro components at build time so every
 * string is pre-rendered into the HTML (no hydration cost).
 */

/** Cache-buster for the August 2026 in-place video re-encode — same
 *  filenames, new (much smaller) bytes. Hostinger serves assets with
 *  a 1-year immutable cache, so re-encoded files must ship under a
 *  new URL; a query param does that without breaking old cached HTML
 *  that still points at the bare filenames. Bump on re-encode. */
export const vv = (src: string): string => `${src}?v=2`;

/** Poster frame for a video — extracted at encode time by
 *  scripts/optimize-videos.py into /kr8tiv-assets/posters/<name>.webp
 *  so video boxes paint instantly instead of sitting blank while
 *  bytes stream in (the old mobile "videos take forever" complaint). */
export const videoPoster = (src: string): string =>
  '/kr8tiv-assets/posters/' + src.split('/').pop()!.replace(/\.mp4$/, '.webp');

export interface Service {
  v: string; t: string; em: string; desc: string; tag: string; price: string; href?: string;
  /** 3D object loop for the scroller circle (slug under
   *  /kr8tiv-assets/disciplines/). When set it replaces `v` in the
   *  circle: <slug>.webm + <slug>.mp4 + <slug>.jpg poster. */
  obj?: string;
}

/** Sources for a discipline's 3D object loop. Rendered in Blender
 *  (obsidian / glass / gold, KR8TIV red + magenta + gold rim light)
 *  on pure #000 so it melts into the circle mask. Bump `v=` on re-render. */
export const disciplineLoop = (slug: string) => ({
  /* v2 (Nov 16): whimsical pass with site motifs (moons, ringed peaks,
     ridge lines). v1 encodes stay one folder up for comparison.
     Phones get a 400px encode via <source media>. */
  webmM: `/kr8tiv-assets/disciplines/v2/${slug}-m.webm?v=2`,
  mp4M: `/kr8tiv-assets/disciplines/v2/${slug}-m.mp4?v=2`,
  webm: `/kr8tiv-assets/disciplines/v2/${slug}.webm?v=2`,
  mp4: `/kr8tiv-assets/disciplines/v2/${slug}.mp4?v=2`,
  poster: `/kr8tiv-assets/disciplines/v2/${slug}.jpg?v=2`,
  /* Nov 25: phones get a 640px H.264 encode (sharper at the larger
     mobile size, about the same bytes as the old 400px pair) and a
     responsive AVIF / WebP still that paints before the video loads. */
  mp4M640: `/kr8tiv-assets/disciplines/v2/${slug}-m640.mp4`,
  avifSet: `/kr8tiv-assets/disciplines/v2/posters/${slug}-400.avif 400w, /kr8tiv-assets/disciplines/v2/posters/${slug}-640.avif 640w`,
  webpSet: `/kr8tiv-assets/disciplines/v2/posters/${slug}-400.webp 400w, /kr8tiv-assets/disciplines/v2/posters/${slug}-640.webp 640w`
});

/* ============================================================
 * PRICING FLOORS  ·  edit these numbers here, nowhere else
 * ------------------------------------------------------------
 * These are ENGAGEMENT FLOORS ("from"), not teaser prices. The
 * previous values ($50+ branding, $50+ video, $200+ web) were at
 * war with the proposals this studio actually sends — a founder
 * reading "Awwwards-level design" beside "$50+" concludes either
 * the quality or the price is a lie, and it invites tire-kickers
 * while handing real prospects a reason to negotiate down.
 *
 * The one deliberately accessible entry point (the starter site)
 * survives — but it's framed as the bottom rung of a ladder in
 * the services intro copy, not as the price of the house.
 * ============================================================ */
const FLOOR = {
  starterWeb:  '$1,950+',
  identity:    '$500+',
  video:       '$400+',
  ecom:        '$1,500+',
  uxui:        '$1,500+',
  industry:    '$600+',
  signConcept: '~$500',   /* sign concept only — PM variable, production separate (Matt t1853u/t1854u) */
  packaging:   '$800+',
  studio:      '$1,500+',
  ads:         '$900+',
  appProduct:  '$3,500+',
  motion:      '$750+'
} as const;

/* Service videos are aligned to the original kr8tiv.io mapping. The
   live site assigns each discipline a specific loop — those reads
   carry intent (e.g. WEBSITE DESIGN → 2-4.mp4 monitor sweep, STUDIO →
   web-av-print-main-image-1.mp4 literal A/V + print montage). The
   previous build had Branding↔Video Editing swapped, used the hero
   video (3-4) for Packaging, and routed forrestbackground/8-1 to
   ads + app product instead of UX/UI's 8-1. Restored to original. */
export const SERVICES: Service[] = [
  { obj: 'laptop', v: 'kr8tiv-assets/2-4.mp4',                          t: 'Website Design',     em: 'web',        desc: 'Websites that look sharp, explain your offer, and make it clear how to call. Built in Edmonton for businesses across Alberta and Canada.', href: '/services/web-design-edmonton/',                                   tag: '/ 001: Web Design, Infrastructure Management + Copywriting',                         price: FLOOR.starterWeb },
  { obj: 'signet', v: 'kr8tiv-assets/12_3.mp4',                         t: 'Branding + Identity',em: 'brand',      desc: 'Your logo, your voice, and a visual system for your website, storefront, packaging, and business cards.', href: '/services/branding/',                                      tag: '/ 002: Logos, Branding Guides, Assets, Style, Story',                                price: FLOOR.identity   },
  { obj: 'mobius', v: 'kr8tiv-assets/12_2.mp4',                         t: 'Video Editing',      em: 'video',      desc: 'Video that stops the scroll and actually gets watched.',                                                   href: '/services/video-editing-edmonton/', tag: '/ 003: Video Editing, Promotional Features + 3D Animation',                          price: FLOOR.video      },
  { obj: 'bag', v: 'kr8tiv-assets/2-1.mp4',                          t: 'Ecommerce Setups',   em: 'Ecom',       desc: 'A customized ecom stack to help you sell anything online.',                                                href: '/services/ecommerce-website-edmonton/', tag: '/ 004: Dropships, Brands & Everything in Between',                                   price: FLOOR.ecom       },
  { obj: 'chain', v: 'kr8tiv-assets/8-1.mp4',                          t: 'UX/UI + Blockchain', em: 'uxui',       desc: 'User experiences people actually love: web apps, mobile apps, and on-chain products.',                    href: '/services/ux-ui-design-edmonton/', tag: '/ 005: Product UX, Interface Systems, Design Tokens + Web3 Flows',                   price: FLOOR.uxui       },
  { obj: 'sign', v: 'kr8tiv-assets/7-1.mp4',                          t: 'Signage + Print',    em: 'Signage',    desc: 'Storefronts, signs and immersive store experiences. Start with a concept, or have KR8TIV manage supplier sourcing, production coordination and installation liaison.', tag: '/ 006: Storefronts, Signs, 3D Store Experiences, Print, Menus + Hospitality', price: FLOOR.signConcept, href: '/services/print-signage-design/' },
  { obj: 'box', v: 'kr8tiv-assets/3-2.mp4',                          t: 'Packaging + Mockups',em: 'package',    desc: 'Unboxing is a ritual, not a logistics problem.',                                                           href: '/services/packaging-design-edmonton/', tag: '/ 007: Ritual-level Packaging Design',                                               price: FLOOR.packaging  },
  { obj: 'lens', v: 'kr8tiv-assets/forrestbackground.mp4',            t: 'Studio + A/V Print', em: 'studio',     desc: 'Full studio production: web + audio/video + print, all under one roof.',                                   href: '/services/studio-av-production-edmonton/', tag: '/ 008: Web + A/V + Print Studio',                                                    price: FLOOR.studio     },
  { obj: 'target', v: 'kr8tiv-assets/6-1.mp4',                          t: 'Ads + Acquisition',  em: 'ads',        desc: 'Creative that converts. Built for performance, written for humans.',                                       href: '/services/ads-acquisition-edmonton/', tag: '/ 009: Paid Social, Display, Video + Creator Campaigns',                             price: FLOOR.ads        },
  { obj: 'phone', v: 'kr8tiv-assets/1-1.mp4',                          t: 'App Product Design', em: 'app',        desc: 'The full app stack: IA, UX, UI, prototypes, handoff.',                                                     href: '/services/app-design-edmonton/', tag: '/ 010: Native + Web App Product Design',                                             price: FLOOR.appProduct },
  { obj: 'gyro', v: 'kr8tiv-assets/9-1.mp4',                          t: 'Motion + 3D',        em: 'motion',     desc: '3D, motion graphics, cinematics, delivered with intent.',                                                 href: '/services/motion-3d-edmonton/', tag: '/ 011: Motion, 3D, Cinematic Sequences',                                             price: FLOOR.motion     }
  /* Do not add a 12th homepage service card. Productized AI
     (agents, company brains, business apps) belongs to the sister
     lab at kr8tiv.ai, not to this studio catalog. */
];

export interface Work {
  src: string; t: string; cat: string; no: string;
}

/** Legacy 4-card homepage teaser — kept for back-compat but the
 *  homepage Work component now reads `WORK_TEASER` (real portfolio
 *  pieces from PORTFOLIO_SELECTED) instead. */
export const WORK: Work[] = [
  { src: 'kr8tiv-assets/3-4.mp4',   t: 'Oblisk',         cat: 'brand + film',  no: '001' },
  { src: 'kr8tiv-assets/Design-29-2-1.mp4', t: 'Design 34', cat: 'branding',   no: '002' },
  { src: 'kr8tiv-assets/forrestbackground.mp4', t: 'Studio', cat: 'a/v + print', no: '003' },
  { src: 'kr8tiv-assets/Untitled-design-58.mp4', t: 'In Motion', cat: 'film', no: '004' }
];

/* ============================================================
 * PORTFOLIO  ·  the real portfolio shown on /work/
 * Three tiers, honestly tagged. The brand voice rule is: nothing
 * is inflated. Client work is client work, personal is personal,
 * own-company is own-company, R&D is R&D. The contrast IS the
 * brand voice — not a flat homogenized "agency case study" wall.
 * ============================================================ */

export type PortfolioTag =
  | 'CLIENT WORK'
  | 'OWN COMPANY'
  | 'PERSONAL'
  | 'R&D';

export interface PortfolioPiece {
  /** stable slug, used for anchors + asset paths if needed */
  slug: string;
  /** display title */
  title: string;
  /** primary tag — drives the badge color */
  tag: PortfolioTag;
  /** secondary descriptor, e.g. 'BRAND + WEB · 2025' */
  subTag: string;
  /** 1–2 sentence honest summary; can include <em> for emphasis */
  desc: string;
  /** optional bullet highlights — kept short, scannable */
  bullets?: string[];
  /** live URL (optional) */
  href?: string;
  /** GitHub repo link (optional) */
  repoHref?: string;
  /** path to a walkthrough video under /public; played on hover */
  video?: string;
  /** override default video aspect-ratio (e.g. portrait phone caps) */
  videoRatio?: string;
}

/** Tier 1 — work I'd actually point at. Big cards, hero treatment. */
export const PORTFOLIO_SELECTED: PortfolioPiece[] = [
  {
    slug: 'evolve',
    title: 'Evolve Eco Blasting',
    tag: 'CLIENT WORK',
    subTag: 'TOTAL REBRAND · BRAND + WEB + PRINT · 2026',
    desc: 'Full rebrand for an Alberta-based mobile dustless blasting outfit: naming, logo, brand bible, website, business cards, and ongoing socials. Bridges heavy industrial spec (rust + bitumen removal, structural steel prep) with residential-friendly delivery (95% less airborne dust, zero silica).',
    bullets: [
      'Naming + new identity from scratch',
      'Live brand bible page hosted on the site',
      '4-card business card system (3 fronts, 1 back)',
      'Ongoing social + email campaign delivery'
    ],
    href: 'https://www.evolveecoblasting.com',
    repoHref: 'https://github.com/kr8tiv-io/Evolve-Rebrand',
    video: '/kr8tiv-assets/portfolio/kr8tiv - evolve eco blasting.mp4'
  },
  {
    slug: 'shane-dooley-roofing-guru',
    title: 'Shane Dooley Roofing Guru',
    tag: 'CLIENT WORK',
    subTag: 'FULL REBRAND · ROOFING SERVICES · LIVE URL PENDING',
    desc: 'Full rebrand for a friend-owned roofing services company in Newfoundland: cinematic site direction, sharper brand voice, and business-card collateral that proves service websites do not have to look generic or overpriced.',
    bullets: [
      'Brand direction tuned for a premium-but-accessible service market',
      'Hero-style project walkthrough video integrated into portfolio',
      'Front + back business-card system for field + referral handoffs',
      'Production URL will be linked here once the site is live'
    ],
    video: '/kr8tiv-assets/portfolio/kr8tiv 7 - shane dooley roofing guru compressed.mp4'
  },
  {
    slug: 'kin',
    title: 'Meet Your KIN',
    tag: 'OWN COMPANY',
    subTag: 'AI COMPANION · PRODUCT · LIVE',
    desc: 'A bespoke, fully-managed AI companion with a concierge service. Voice, Telegram, WhatsApp, and total computer control. Six limited Genesis bloodlines, persistent memory that evolves over time, white-glove onboarding so non-technical users never see an API key.',
    bullets: [
      'Voice + Telegram + WhatsApp + computer control',
      'Six Genesis bloodlines with distinct specializations',
      'Lifetime 25% discount + revenue-share for early holders',
      'Built on KR8TIV AI infrastructure'
    ],
    href: 'https://www.meetyourkin.com',
    repoHref: 'https://github.com/kr8tiv-io/Kin',
    video: '/kr8tiv-assets/portfolio/kr8tiv 3 - Meet Your Kin.mp4'
  },
  {
    slug: 'kr8tiv-ai',
    title: 'KR8TIV AI',
    tag: 'OWN COMPANY',
    subTag: 'AI + DEFI INFRASTRUCTURE · OUR AI ATELIER',
    desc: '"Surfing the singularity": our sister company building decentralized AI for the masses. Open-source AI companions, DeFi infrastructure, and the Pinky and the Brain ecosystem on Bags.fm. 17 public repos, mission-control dashboards, runtime-truth contracts.',
    bullets: [
      'AI agent governance + multi-agent orchestration',
      'Schema-first runtime contracts for KIN',
      'PinkBrain DeFi infrastructure on Solana',
      '17 public repos · open-source by default'
    ],
    href: 'https://kr8tiv.ai',
    repoHref: 'https://github.com/kr8tiv-io',
    video: '/kr8tiv-assets/portfolio/kr8tiv 4 - kr8tiv ai.mp4'
  },
  {
    slug: 'kr8tiv-io',
    title: 'kr8tiv.io',
    tag: 'OWN COMPANY',
    subTag: 'THE ATELIER · YOU ARE HERE',
    desc: 'This site. A cyber-renaissance design atelier: brand, web, motion, AI. Built with Astro 5, GSAP, Three.js, custom WebGL prism shaders, a kintsugi shatter menu, an oracle command palette, and a katana cursor trail on the Reel section. <em>Death to generic.</em>',
    bullets: [
      'Astro 5 + Vite + strict TypeScript',
      'Three.js WebGL prism · katana trail · refractive lake',
      'GSAP horizontal scroller · scroll-driven reveal',
      'Hybrid menu system: Oracle ⌘K · Kintsugi shatter · Multi-state nav'
    ],
    href: '/',
    repoHref: 'https://github.com/kr8tiv-io',
    /* No walkthrough video — the case study IS the experience. The
       Build Notes page is where the writing lives. */
  }
];

/** Tier 2 — Brand Kit. Printed business-card collateral from two
 *  full rebrands (Evolve + Shane Dooley Roofing Guru). */
export interface BrandKitImage {
  src: string;
  caption: string;
}
export const PORTFOLIO_EVOLVE_CARDS: BrandKitImage[] = [
  { src: '/kr8tiv-assets/portfolio/evolve-cards/Evolve Business Card(3).webp', caption: 'FRONT · 01' },
  { src: '/kr8tiv-assets/portfolio/evolve-cards/Evolve Business Card(2).webp', caption: 'FRONT · 02' },
  { src: '/kr8tiv-assets/portfolio/evolve-cards/Evolve Business Card(5).webp', caption: 'FRONT · 03' },
  { src: '/kr8tiv-assets/portfolio/evolve-cards/Evolve Business Card(4).webp', caption: 'BACK' },
  { src: '/kr8tiv-assets/portfolio/dooley-cards/Shane-Dooley-Business-Card-Front.webp', caption: 'SHANE DOOLEY · FRONT' },
  { src: '/kr8tiv-assets/portfolio/dooley-cards/Shane-Dooley-Business-Card-Back.webp', caption: 'SHANE DOOLEY · BACK' }
];

/** Tier 3 — Studio Lab. Personal projects, venture work, friend
 *  favors, R&D. Smaller cards, dense grid, honestly tagged. */
export const PORTFOLIO_STUDIO_LAB: PortfolioPiece[] = [
  {
    slug: 'aurora',
    title: 'Aurora Ventures',
    tag: 'OWN COMPANY',
    subTag: 'BLOCKCHAIN VENTURE ARM',
    desc: 'The blockchain venture arm of KR8TIV. Quiet-infrastructure thesis: DAOs (aurabnb, Aura-H2o, Aura-Farms), token launchpad with configurable taxes, protocol tooling. Less ICO theatre, more boring rails.',
    href: 'https://www.auroraventures.agency',
    repoHref: 'https://github.com/kr8tiv-io/Aurora-Ventures-Website',
    video: '/kr8tiv-assets/portfolio/kr8tiv 1 - aurora ventures.mp4'
  },
  {
    slug: 'jarvis',
    title: 'Jarvis',
    tag: 'PERSONAL',
    subTag: 'AI TRADING BOT · 81+ STRATEGIES · 55⭐',
    desc: 'Personal AI trading copilot for BTC / ETH / SOL with 81+ strategies and a multi-agent oversight loop. Built for myself; kept open source. Most-starred repo in the personal vault.',
    href: 'https://github.com/Matt-Aurora-Ventures/Jarvis',
    repoHref: 'https://github.com/Matt-Aurora-Ventures/Jarvis',
    video: '/kr8tiv-assets/portfolio/kr8tiv 2 - jarvis life.mp4'
  },
  {
    slug: 'pinky-and-the-brain',
    title: 'Pinky and the Brain',
    tag: 'OWN COMPANY',
    subTag: 'MEME → INFRASTRUCTURE · SOLANA',
    desc: '$BRAIN token on Bags.fm dressed as a meme, plumbed as infrastructure. Auto-compounding LP, fees-routed-to-AI-credits engine, treasury dashboard, cross-chain basket token (PinkBrain-Alvara). The plot is to take over the world.',
    href: 'https://www.pinkyandthebrain.fun',
    repoHref: 'https://github.com/kr8tiv-io/pinky-and-the-brain-site',
    video: '/kr8tiv-assets/portfolio/kr8tiv 6 - Pinky and the brain meme website.mp4'
  },
  {
    slug: 'savage-fit',
    title: 'Savage Fit',
    tag: 'CLIENT WORK',
    subTag: 'FITNESS · IFBB PRO · LIVE · REFRESH PLANNED',
    desc: 'Online fitness coaching for IFBB Pro Xenia Busigin: full digital presence (site, socials, email campaigns, app-driven training library). Live and earning; slated for a refresh round.',
    href: 'https://www.wethesavage.com',
    repoHref: 'https://github.com/kr8tiv-io/savage-fit-website',
    video: '/kr8tiv-assets/portfolio/kr8tiv 5 - body by xenia.mp4'
  }
];

/** Tier 4 — Code Vault. Three GitHub orgs as live cards. */
export interface CodeVaultOrg {
  /** display name */
  name: string;
  /** github org/user URL */
  href: string;
  /** one-line org bio */
  bio: string;
  /** total public repo count */
  repoCount: number;
  /** featured repo slugs to highlight */
  pinned: { name: string; desc: string; lang?: string; stars?: number }[];
  /** type label */
  kind: 'OWN COMPANY · DESIGN' | 'OWN COMPANY · AI + DEFI' | 'PERSONAL';
}

export const PORTFOLIO_CODE_VAULT: CodeVaultOrg[] = [
  {
    name: 'kr8tiv-io',
    href: 'https://github.com/kr8tiv-io',
    bio: 'Branding alchemist + design samurai. The marketing and design arm.',
    repoCount: 12,
    kind: 'OWN COMPANY · DESIGN',
    pinned: [
      { name: 'Evolve-Rebrand', desc: 'Total commercial surface-restoration rebrand', lang: 'HTML' },
      { name: 'Kinbykr8tiv-website', desc: 'KIN AI companion landing with 3D creatures', lang: 'HTML' },
      { name: 'kr8tiv-ai-website', desc: 'AI atelier site: autonomous content creation', lang: 'TypeScript' }
    ]
  },
  {
    name: 'kr8tiv-ai',
    href: 'https://github.com/kr8tiv-io',
    bio: 'Decentralized AI for the masses: open-source companions, DeFi infrastructure, the Pinky and the Brain ecosystem.',
    repoCount: 17,
    kind: 'OWN COMPANY · AI + DEFI',
    pinned: [
      { name: 'Kin', desc: 'AI companion platform: Solana NFT bloodlines', lang: 'TypeScript' },
      { name: 'kr8tiv-mission-control', desc: 'AI agent governance + multi-agent orchestration', lang: 'TypeScript' },
      { name: 'kr8tiv-runtime-truth-contracts', desc: 'Schema-first runtime contracts for KIN', lang: 'TypeScript' }
    ]
  },
  {
    name: 'Matt-Aurora-Ventures',
    href: 'https://github.com/Matt-Aurora-Ventures',
    bio: 'Builder · reformed VC · accidental media empire operator. Open source everything, ship nightly.',
    repoCount: 9,
    kind: 'PERSONAL',
    pinned: [
      { name: 'Jarvis', desc: 'AI trading bot · 81+ strategies', lang: 'Python', stars: 55 },
      { name: 'kr8tiv-launchpad', desc: 'Token launchpad with configurable taxes', lang: 'TypeScript' },
      { name: 'kr8tiv-MSW', desc: 'Iterative spec-driven dev loop system', lang: 'TypeScript', stars: 1 }
    ]
  }
];

/** Tier 1 condensed — the homepage Work teaser linking through to
 *  /work/. Curated so the homepage reads as a taste, not a full index. */
export const PORTFOLIO_HOMEPAGE_TEASER: PortfolioPiece[] = PORTFOLIO_SELECTED.filter((piece) =>
  ['evolve', 'shane-dooley-roofing-guru', 'kin', 'kr8tiv-ai'].includes(piece.slug)
);

export interface Variant {
  slug: string;       // e.g. 'v8-prism'
  num: string;        // '08'
  name: string;       // 'Prism'
  accent: string;     // primary accent hex
  href: string;       // external href into Desktop variant files (legacy)
}

/* ------------------------------------------------------------------ */
/*  Section Indicator — the numeric bar at the bottom of every page.  */
/*  Was originally a variant-chooser linking to legacy v7…v16 HTML    */
/*  files on the Desktop. Now it tracks the reader's position through */
/*  the CURRENT page: one tick per major section, lit as the section  */
/*  scrolls into view.                                                */
/* ------------------------------------------------------------------ */
export interface Section {
  num: string;        // zero-padded '01'..
  name: string;       // short label shown as title attribute
  id: string;         // DOM id / class to observe + hash to scroll to
}

/** Homepage sections, in scroll order. Defaults when none passed. */
export const HOMEPAGE_SECTIONS: Section[] = [
  { num: '01', name: 'Splash',    id: 'hero' },
  { num: '02', name: 'Doctrine',  id: 'doctrine' },
  { num: '03', name: 'Index',     id: 'services' },
  { num: '04', name: 'Manifesto', id: 'why' },
  { num: '05', name: 'Interlude', id: 'interlude' },
  { num: '06', name: 'Method',    id: 'process-preview' },
  { num: '07', name: 'Work',      id: 'work' },
  { num: '08', name: 'Reel',      id: 'reel' },
  { num: '09', name: 'Contact',   id: 'contact' },
  { num: '10', name: 'Start',     id: 'big-cta' }
];

/** /process/ page sections. */
export const PROCESS_SECTIONS: Section[] = [
  { num: '01', name: 'Masthead',    id: 'process-masthead' },
  { num: '02', name: 'Battle Cry',  id: 'battle-cry' },
  { num: '03', name: 'Ethos',       id: 'ethos' },
  { num: '04', name: 'What to expect', id: 'expect' },
  { num: '05', name: '9 Steps',     id: 'step-kontact' },
  { num: '06', name: 'Zero Adult',  id: 'zero-adult' },
  { num: '07', name: 'Founder',     id: 'founder-letter' },
  { num: '08', name: 'AI Systems',  id: 'ai-solutions' },
  { num: '09', name: 'Love + Lore', id: 'love-lore' },
  { num: '10', name: 'Start',       id: 'start' }
];

/** /start/ page sections — mirrors the intake form's 10 sections. */
export const START_SECTIONS: Section[] = [
  { num: '01', name: 'Hello',       id: 's01' },
  { num: '02', name: 'Project',     id: 's02' },
  { num: '03', name: 'Timeline',    id: 's03' },
  { num: '04', name: 'Budget',      id: 's04' },
  { num: '05', name: 'Goals',       id: 's05' },
  { num: '06', name: 'Audience',    id: 's06' },
  { num: '07', name: 'Competitors', id: 's07' },
  { num: '08', name: 'Tech',        id: 's08' },
  { num: '09', name: 'Design',      id: 's09' },
  { num: '10', name: 'Confirm',     id: 's10' }
];

/* Legacy variant chooser — kept in content.ts in case we ever restore
   the multi-variant navigation. Not rendered anywhere today. */
export const VARIANTS: Variant[] = [
  { slug: 'v7-obsidian',  num: '07', name: 'Obsidian',  accent: '#6f1c1c', href: '/kr8tiv-v7-obsidian.html' },
  { slug: 'v8-prism',     num: '08', name: 'Prism',     accent: '#ff6ad5', href: '/' },
  { slug: 'v9-magnetic',  num: '09', name: 'Magnetic',  accent: '#4c7cff', href: '/kr8tiv-v9-magnetic.html' },
  { slug: 'v10-voltage',  num: '10', name: 'Voltage',   accent: '#d2ff00', href: '/kr8tiv-v10-voltage.html' },
  { slug: 'v11-silk',     num: '11', name: 'Silk',      accent: '#f7d6c4', href: '/kr8tiv-v11-silk.html' },
  { slug: 'v12-orbit',    num: '12', name: 'Orbit',     accent: '#7affd0', href: '/kr8tiv-v12-orbit.html' },
  { slug: 'v13-frequency',num: '13', name: 'Frequency', accent: '#ff3d80', href: '/kr8tiv-v13-frequency.html' },
  { slug: 'v14-tetra',    num: '14', name: 'Tetra',     accent: '#ffa500', href: '/kr8tiv-v14-tetra.html' },
  { slug: 'v15-nightshift',num:'15', name: 'Nightshift',accent: '#3d5dff', href: '/kr8tiv-v15-nightshift.html' },
  { slug: 'v16-broadcast',num: '16', name: 'Broadcast', accent: '#ff2d4a', href: '/kr8tiv-v16-broadcast.html' }
];

/** True-vector KR8TIV wordmark path in the 1800x600 coordinate space
 *  (matches public/kr8tiv-assets/kr8tiv-logo-clean.svg). */
export const KR8TIV_LOGO_D = 'M1282 114L1281 119L1252 147L1220 117L1250 85ZM842.5 155.5L885.5 155.5L885.5 486.5L842.5 486.5ZM906.5 155.5L949.5 155.5L949.5 486.5L906.5 486.5ZM104.5 161L150 161L150 341L333 161L396 161L263 295L388 446L417 487L357 487L229 329L150.5 404L150.5 486L104.5 486ZM1745 162.5L1569 404L1394 160.5L1419 160.5L1424 164L1568 368L1576 362L1718 162.5ZM713 226L683 245.5L539 245.5L539 445L523 480L518.5 481L518.5 226ZM1068 226L1263.5 226L1263.5 481L1246 451L1244 439L1244 245.5L1096 245.5L1071 231Z';
