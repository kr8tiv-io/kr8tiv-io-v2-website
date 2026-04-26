/**
 * Content data — services + work + variant list.
 * Typed once, imported by Astro components at build time so every
 * string is pre-rendered into the HTML (no hydration cost).
 */

export interface Service {
  v: string; t: string; em: string; desc: string; tag: string; price: string;
}

/* Service videos are aligned to the original kr8tiv.io mapping. The
   live site assigns each discipline a specific loop — those reads
   carry intent (e.g. WEBSITE DESIGN → 2-4.mp4 monitor sweep, STUDIO →
   web-av-print-main-image-1.mp4 literal A/V + print montage). The
   previous build had Branding↔Video Editing swapped, used the hero
   video (3-4) for Packaging, and routed forrestbackground/8-1 to
   ads + app product instead of UX/UI's 8-1. Restored to original. */
export const SERVICES: Service[] = [
  { v: 'kr8tiv-assets/2-4.mp4',                          t: 'Website Design',     em: 'web',        desc: 'We build sites that work, look sharp, and say something worth reading.',              tag: '/ 001 — Web Design, Infrastructure Management + Copywriting',                         price: '$200+' },
  { v: 'kr8tiv-assets/12_3.mp4',                         t: 'Branding + Identity',em: 'brand',      desc: 'Build a logo and company brand that captures and holds attention.',                   tag: '/ 002 — Logos, Branding Guides, Assets, Style, Story',                                price: '$50+'  },
  { v: 'kr8tiv-assets/12_2.mp4',                         t: 'Video Editing',      em: 'video',      desc: 'Video that stops the scroll and actually gets watched.',                              tag: '/ 003 — Video Editing, Promotional Features + 3D Animation',                          price: '$50+'  },
  { v: 'kr8tiv-assets/2-1.mp4',                          t: 'Ecommerce Setups',   em: 'Ecom',       desc: 'A customized ecom stack to help you sell anything online.',                           tag: '/ 004 — Dropships, Brands & Everything in Between',                                   price: '$500+' },
  { v: 'kr8tiv-assets/8-1.mp4',                          t: 'UX/UI + Blockchain', em: 'uxui',       desc: 'We design user experiences people love — for web applications, mobile apps.',         tag: '/ 005 — Design for Print, Magazines, Music, Real Estate, Travel + Hospitality',       price: '$500+' },
  { v: 'kr8tiv-assets/7-1.mp4',                          t: 'Industry Design',    em: 'Industry',   desc: 'Specialized design for print and digital in luxury real estate, music.',              tag: '/ 006 — Design for Print, Magazines, Music, Real Estate, Travel + Hospitality',       price: '$100+' },
  { v: 'kr8tiv-assets/3-2.mp4',                          t: 'Packaging + Mockups',em: 'package',    desc: 'Unboxing is a ritual, not a logistics problem.',                                      tag: '/ 007 — Ritual-level Packaging Design',                                               price: '$300+' },
  { v: 'kr8tiv-assets/forrestbackground.mp4',            t: 'Studio + A/V Print', em: 'studio',     desc: 'Full studio production: web + audio/video + print, all under one roof.',              tag: '/ 008 — Web + A/V + Print Studio',                                                    price: '$600+' },
  { v: 'kr8tiv-assets/6-1.mp4',                          t: 'Ads + Acquisition',  em: 'ads',        desc: 'Creative that converts. Built for performance, written for humans.',                  tag: '/ 009 — Paid Social, Display, Video + Creator Campaigns',                             price: '$400+' },
  { v: 'kr8tiv-assets/1-1.mp4',                          t: 'App Product Design', em: 'app',        desc: 'The full app stack: IA, UX, UI, prototypes, handoff.',                                tag: '/ 010 — Native + Web App Product Design',                                             price: '$1k+'  },
  { v: 'kr8tiv-assets/9-1.mp4',                          t: 'Motion + 3D',        em: 'motion',     desc: '3D, motion graphics, cinematics — delivered with intent.',                            tag: '/ 011 — Motion, 3D, Cinematic Sequences',                                             price: '$250+' }
  /* AI Partnership panel removed at user request — the Design-34 loop
     (with on-video "Life, the universe, everything?" lettering) lived
     on the original kr8tiv.io as a manifesto piece, not a service. AI
     services are still surfaced on the homepage via the loud InlineCTA
     "We also build full AI systems for business" + the dedicated
     /process/ page section, so the discipline is still represented
     just not as a 12th scroller panel. */
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
    desc: 'Full rebrand for an Alberta-based mobile dustless blasting outfit — naming, logo, brand bible, website, business cards, and ongoing socials. Bridges heavy industrial spec (rust + bitumen removal, structural steel prep) with residential-friendly delivery (95% less airborne dust, zero silica).',
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
    repoHref: 'https://github.com/kr8tiv-ai/Kin',
    video: '/kr8tiv-assets/portfolio/kr8tiv 3 - Meet Your Kin.mp4'
  },
  {
    slug: 'kr8tiv-ai',
    title: 'KR8TIV AI',
    tag: 'OWN COMPANY',
    subTag: 'AI + DEFI INFRASTRUCTURE · OUR AI ATELIER',
    desc: '"Surfing the singularity" — our sister company building decentralized AI for the masses. Open-source AI companions, DeFi infrastructure, and the Pinky and the Brain ecosystem on Bags.fm. 17 public repos, mission-control dashboards, runtime-truth contracts.',
    bullets: [
      'AI agent governance + multi-agent orchestration',
      'Schema-first runtime contracts for KIN',
      'PinkBrain DeFi infrastructure on Solana',
      '17 public repos · open-source by default'
    ],
    href: 'https://kr8tiv.ai',
    repoHref: 'https://github.com/kr8tiv-ai',
    video: '/kr8tiv-assets/portfolio/kr8tiv 4 - kr8tiv ai.mp4'
  },
  {
    slug: 'kr8tiv-io',
    title: 'kr8tiv.io',
    tag: 'OWN COMPANY',
    subTag: 'THE ATELIER · YOU ARE HERE',
    desc: 'This site. A cyber-renaissance design atelier — brand, web, motion, AI. Built with Astro 5, GSAP, Three.js, custom WebGL prism shaders, a kintsugi shatter menu, an oracle command palette, and a katana cursor trail on the Reel section. <em>Death to generic.</em>',
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

/** Tier 2 — Brand Kit · Evolve. The four card faces (3 fronts, 1
 *  back) shown as a bento spread immediately after Selected work,
 *  making the breadth of the Evolve engagement legible. */
export interface BrandKitImage {
  src: string;
  caption: string;
}
export const PORTFOLIO_EVOLVE_CARDS: BrandKitImage[] = [
  { src: '/kr8tiv-assets/portfolio/evolve-cards/Evolve Business Card(3).png', caption: 'FRONT · 01' },
  { src: '/kr8tiv-assets/portfolio/evolve-cards/Evolve Business Card(2).png', caption: 'FRONT · 02' },
  { src: '/kr8tiv-assets/portfolio/evolve-cards/Evolve Business Card(5).png', caption: 'FRONT · 03' },
  { src: '/kr8tiv-assets/portfolio/evolve-cards/Evolve Business Card(4).png', caption: 'BACK' }
];

/** Tier 3 — Studio Lab. Personal projects, venture work, friend
 *  favors, R&D. Smaller cards, dense grid, honestly tagged. */
export const PORTFOLIO_STUDIO_LAB: PortfolioPiece[] = [
  {
    slug: 'aurora',
    title: 'Aurora Ventures',
    tag: 'OWN COMPANY',
    subTag: 'BLOCKCHAIN VENTURE ARM',
    desc: 'The blockchain venture arm of KR8TIV. Quiet-infrastructure thesis — DAOs (aurabnb, Aura-H2o, Aura-Farms), token launchpad with configurable taxes, protocol tooling. Less ICO theatre, more boring rails.',
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
    repoHref: 'https://github.com/kr8tiv-ai/pinky-and-the-brain-site',
    video: '/kr8tiv-assets/portfolio/kr8tiv 6 - Pinky and the brain meme website.mp4'
  },
  {
    slug: 'savage-fit',
    title: 'Savage Fit',
    tag: 'CLIENT WORK',
    subTag: 'FITNESS · IFBB PRO · LIVE · REFRESH PLANNED',
    desc: 'Online fitness coaching for IFBB Pro Xenia Busigin — full digital presence (site, socials, email campaigns, app-driven training library). Live and earning; slated for a refresh round.',
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
      { name: 'kr8tiv-ai-website', desc: 'AI atelier site — autonomous content creation', lang: 'TypeScript' }
    ]
  },
  {
    name: 'kr8tiv-ai',
    href: 'https://github.com/kr8tiv-ai',
    bio: 'Decentralized AI for the masses — open-source companions, DeFi infrastructure, the Pinky and the Brain ecosystem.',
    repoCount: 17,
    kind: 'OWN COMPANY · AI + DEFI',
    pinned: [
      { name: 'Kin', desc: 'AI companion platform — Solana NFT bloodlines', lang: 'TypeScript' },
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

/** Tier 1 condensed — the 3 cards shown on the homepage Work section
 *  as a teaser linking through to /work/. Just the most recognizable
 *  three so the homepage reads as a curated taste, not a full index. */
export const PORTFOLIO_HOMEPAGE_TEASER: PortfolioPiece[] = [
  PORTFOLIO_SELECTED[0],   // Evolve
  PORTFOLIO_SELECTED[1],   // KIN
  PORTFOLIO_SELECTED[2]    // kr8tiv.ai
].filter((p): p is PortfolioPiece => Boolean(p));

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

/** Logo path (traced from the 1800x600 mask PNG). Kept here so it can
 *  be imported by components without re-declaring the 9kB of `d` data. */
export const KR8TIV_LOGO_D = 'M1250 85H1253V86H1254V87H1255V88H1256V89H1257V90H1258V91H1259V92H1260V93H1261V94H1262V95H1263V96H1264V97H1265V98H1266V99H1267V100H1268V101H1269V102H1270V103H1271V104H1272V105H1273V106H1274V107H1275V108H1276V109H1277V110H1278V111L1282 114L1281 119H1280L1278 122H1276V123H1275V124H1274V125H1273V126H1272V127H1271V128H1270V129H1269V130H1268V131H1267V132H1266V133H1265V134H1264V135H1263V136H1262V137H1261V138H1260V139H1259V140H1258V141H1257V142H1256V143H1255L1252 147L1248 146V145H1247V144H1246V143H1245V142H1244V141H1243V140H1242V139L1238 136V134H1237V133H1236V132H1235V131H1234V130H1233V129H1232V128H1231V127H1230V126H1229V125H1228V124H1227V123H1226V122H1225V121H1224V120L1220 117V114H1221V113H1222V112H1223V111H1224V110H1225V109H1226V108H1227V107H1228V106H1229V105H1230V104H1231V103H1232V102H1233V101H1234V100H1235L1238 96H1240V94H1242V93H1243V92H1244V91H1245V90H1246V89H1247ZM843 155H885V156H886V486H885V487H843V486H842V156H843ZM907 155H949V156H950V486H949V487H907V486H906V156H907ZM105 160H108V161H149V162H150V341H152V340H153V339H154V338H155V337H156V336H157V335H158V334H159V333H160V332H161V331H162V330H163V329H164V328H165V327H166V326H167V325H168V324H169V323H170V322H171V321H172V320H173V319H174L177 315H179V313H180V312H182V310H183V309H185V308H186V307H187V306H188V305H189V304H190V303H191V302H192V301H193V300H194V299H195V298H196V297H197V296H198V295H199V294H200V293H201V292H202V291H203V290H204V289H205V288H206V287H207V286H208V285H209V284H210V283H211V282H212V281H213V280H214V279H215V278H216V277H217V276H218V275H219V274H220V273H221V272H222V271H223V270H224V269H225V268H226V267H227V266H228V265H229V264H230V263H231V262H232V261H233V260H234L237 256H239V254H241V253H242V252H243V251H244V250L248 247V245H249V244H251V242H252L254 239H256V238H257V236H258L260 233H262V231H263V230H265V228H267V227H268V226H269V225H270V224H271V223H272V222H273V221H274V220H275L278 216H280V215H281V213H283V212H284V210H286V208H287V207H289V205H291V204H292V202H293V201H294V200H295V199H296V198H297V197H298L301 193H303V192L307 189V187H309V186H310V184H312V183H313V182H314V181H315V180H316V179H317V178H318V177H319V176H320V175H321V174H322V173H323V172H324V171H325V170L329 167V165H330L333 161H336V160H337V161H390V160H392V161H396V163H395V164H394V165H393V166H392L389 170H387V172H386V173H385V174H384V175H383V176H382V177H381L378 181H376V182H375V183H374V184H373V185H372V186H371L368 190H366V191H365V193H363V195H362V196H360V198H359L356 202H354V203H353V204H352V205H351V206H350V207H349V208H348V209H347V210H346V211H345V212H344V213H343V214H342V215H341V216H340V217L336 220V222H334V224H333V225H331V226H330V228H328V229L324 232V234H322V236H320V237H319V239H317V240H316V242H314V243H313V245H311V246H310V248H308V249H307V251H305V252H304V254H302V255L298 258V260H296V261H295V263H293V265H291V266H290V268H288V269H287V271H285V272H284V274H282V275H281V277H279V278H278V280H276V281H275V283H273V284H272V286H270V287H269V289H267V290H266V292H264V294H263V295H264V297H265V298H266V299H267V300H268V301H269V302H270V303H271V304H272V305H273V306H274V307L278 310V312H279V314L281 315V317H282V318H283V319H284V320H285V321H286V322L290 325V327L293 329V332H294V333H295V334H296V335H297V336L301 339V341H302V343L304 344V346H305V347H306V348H307V349H308V350H309V351H310V352H311V353H312V354L316 357V359H317L318 363L322 365V367L326 370V372L328 373V375H329V376H330V377L334 380V382H335V383L339 386V388H340V390L342 391V393H344V394L346 395V397L350 400L351 404H352V405H353V406H354V407H355V408L359 411V413L361 414V416L365 419L366 423H368V424L372 427V429L376 432V434L378 435V437H379V438H380V439H381V440H382V441H383V442H384V443L388 446V448L390 449L391 453H392V454H393V455H394V456L398 459V461L400 462L401 466H402V467H403V468H404V469H405V470H406V471H407V472H408V473L412 476V478H413L414 482L418 485L417 487H357V485H356V484H355V483H354V482L350 479V477H349V476H348V474L345 472V470H344V469H342V467H341V465L339 464V462H338V461H337V460H336V459L332 456V454L329 452V450L327 449V447H326V446H325V445H324V444H323V443L319 440V438L315 435V433L313 432V430H312V429H311V428H310V427L306 424V422L303 420V418L301 417V415H300V414H299V413H298V412L294 409V407L291 405V403L289 402V400H288V399H287V398H286V397H285V396H284V395L280 392V390L277 388V386L275 385V383H274V382H273V381H272V380H271V379H270V378L266 375L265 371H264V370H263V368H262V367H261V366L257 363V361L254 359V357L252 356V354H251V353H249V351H248V350H247V349H246V348L242 345V343H241V342H240V340L237 338V336H235V334H234L231 330H229V329H228V330H226V331L223 333V335H222V336H220V338H219L216 342H214V344H212V345H211V347H209V348H208V350H206V351H205V353H203V354H202V356H200V358H199V359H198V360H197V361H196V362H195V363H194V364H193L190 368H188V370H187V371H185V373H184L181 377H179V379H178V380H176V382H174V384H173V385H171V387H170V388H168V390H167V391H165V392H164V393H163V394H162V395H161V396H160V397H159V398H158V399H157L154 403H152V404H151V406H150V486H149V487H105V486H104V483H103V469H104V464H103V438H104V381H103V343H104V342H103V333H104V332H103V302H104V301H103V290H104V282H103V243H104V233H103V208H104V185H103V162H104ZM1414 160H1419V161H1421V162L1424 164V166L1426 167L1427 171H1428V172L1430 173V175L1433 177V180H1434V181L1437 183V185L1439 186L1440 190H1441V191L1445 194V196H1446V198L1448 199V201H1449V202L1453 205L1454 209H1455V210H1456V212L1460 215V217L1462 218L1463 222H1464V223L1468 226V229H1469V230L1471 231V233L1475 236V238L1477 239V241H1478V242L1480 243V245L1483 247L1484 251H1485V252L1488 254V256L1491 258V261L1495 264V266L1497 267V269L1499 270V272L1503 275V277L1505 278L1506 282H1507V283L1511 286V288H1512V290L1514 291V293H1515V294L1518 296V298L1520 299V302H1521V303H1522V304L1526 307V309H1527V311L1529 312V314H1530V315L1534 318V320H1535V322L1537 323V325H1538V326L1541 328V330L1544 332V335H1545V336L1549 339V341H1550V343L1552 344V346H1553V347L1557 350L1558 354H1559V355H1560V357L1563 359L1564 363L1566 364V366H1567L1568 368L1572 367V365L1576 362V360L1578 359V357H1579V356L1581 355V353L1583 352L1584 348H1585V347L1589 344V342L1591 341V339L1593 338V336L1597 333V331L1599 330V328L1601 327V325H1602V324L1604 323V321L1606 320L1607 316H1608V315L1612 312L1613 308H1614V307L1616 306V304L1619 302L1620 298L1624 295V293L1627 291L1628 287H1629V286L1631 285V283L1635 280L1636 276H1637V275H1638V274L1642 271L1643 267H1644V266H1645V264L1648 262V260L1651 258L1652 254H1653V253L1657 250V248L1659 247L1660 243H1661V242L1665 239V237H1666V235L1668 234V232L1672 229V227L1674 226V224L1676 223V221H1677V220L1680 218V216L1683 214V211H1684V210H1685V209L1689 206V204H1690L1691 200H1692V199H1693V198L1697 195L1698 191H1699V190H1700V188L1704 185V183H1705V182H1706V180L1709 178V176L1712 174V172L1714 171V169H1715V167L1718 165V163H1719L1720 161H1741V160H1742V161H1745V162H1744V164L1742 165L1741 169L1737 172V174H1736L1735 178H1734V179H1733V180L1729 183V185H1728L1727 189H1726V190H1724V192L1721 194V197H1720V198L1718 199V201L1714 204V206H1713L1712 210H1710V212L1706 215V217L1704 218L1703 222H1701V223H1700V225L1698 226L1697 230L1694 232V234L1692 235V237L1689 239V241H1688V242L1685 244V246L1683 247L1682 251H1681V252L1677 255V257H1676V259L1674 260V262H1673V263L1669 266V268H1668V270L1666 271V273H1665V274H1664V275L1660 278V281H1659V282L1657 283V285H1656V286L1652 289V291H1651L1650 295H1649V296L1645 299V301L1643 302L1642 306H1641V307H1640V308L1636 311V313L1634 314L1633 318H1632V319L1628 322V324H1627V326L1625 327V329H1624V330L1620 333L1619 337H1618V338L1616 339V341L1613 343V345L1611 346L1610 350H1608V352L1605 354L1604 358H1603V359L1601 360V362L1598 364V366L1596 367V369L1592 372V374L1590 375V378H1589V379H1588V380L1584 383V386H1583V387H1582V389L1578 392V394L1576 395L1575 399L1572 401V403H1570V404H1569V403H1567V401L1563 398V396L1561 395V393L1559 392V390L1555 387V384H1554V383L1552 382V380L1548 377V375H1547V374H1546V372L1543 370V368L1540 366V363L1537 361V359H1536V358L1532 355L1531 351H1530V350L1526 347V345L1524 344L1523 340L1519 337V335L1516 333V331L1514 330V328H1513V327L1511 326V324L1508 322L1507 318L1503 315V313L1501 312V310L1499 309V307L1496 305V303L1494 302V300L1491 298V296H1490V295L1488 294V292L1485 290L1484 286H1483V285L1479 282V279H1478V278L1476 277V275L1473 273V271H1472V270H1471V268L1468 266V264L1464 261V259L1462 258V256L1460 255V253L1456 250V248H1455V246L1453 245V243L1450 241V239L1448 238V236H1447V235L1445 234V232L1442 230L1441 226L1438 224V222L1435 220V218L1433 217V215H1432V214L1430 213V211L1427 209L1426 205H1425V204L1421 201V199L1419 198L1418 194H1417V193L1413 190L1412 186H1411V185L1409 184V182H1408V181L1404 178V176H1403V174L1401 173V171H1400V170L1398 169V167L1395 165L1394 161H1414ZM520 225H694V226L711 225V226H713V227L711 228V230H709V231L705 232L704 234H701L699 237H695L693 240H691L690 242H687V243H685V244H683V245H541V246H539V267H540V416H539V445H538V448H537V452L534 454V457L532 458V461H531V463L529 464V467H528V469L526 470L525 475L523 476V480H522V481H519V251H518V226H520ZM1068 225H1260V226H1263V227H1264V480H1263V481L1261 480V478H1260V476H1259L1258 472H1257V471H1256V469H1255V466H1254V464H1253L1252 460L1250 459V457H1249V455H1248V453H1247V451H1246L1245 439H1244V430H1245V417H1244V403H1245V396H1244V246H1242V245H1096L1095 243H1091L1089 240H1086V239H1084L1082 236H1080V235L1076 234L1074 231H1071V230L1067 227Z';
