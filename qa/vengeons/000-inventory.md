# 000 — Raw-HTML inventory (Vengeons pass)

Checkpoint only. No source changes.

## Build

- Command: `npm run build` (`astro build`)
- Exit code: **0**
- When: 2026-11-06 12:49:50 (build log)
- Result: **17 page(s) built** into `dist/`
- Scope: every built HTML route (`dist/**/index.html` plus `dist/404.html`, which Astro emits as a file, not a directory index)

Method: read the built files with scripts and styles removed, HTML comments removed, `svg` / `video` / `aria-hidden` subtrees removed, then take visible text in document order. Nothing was executed in a browser. “First 100 words” is that visible string. A second window, “first 100 in `<main>`”, is noted only when it changes the flag.

There is no Search Console export. Primary query tokens below are inferred from each page’s obvious intent (title + URL). Treat them as a checklist, not as proven queries. Prompt 001 still needs a GSC paste before titles are locked.

## Presence

Every route has a `<title>`, a meta description, a canonical (`https://kr8tiv.io…`), and exactly one `<h1>` in the static file. None of those strings are injected by JavaScript.

Video is a plate, not the answer. No page puts its H1 or lead paragraph inside a `<script>`, a canvas, or a video text track. The home hero, service heroes, work cards, the blog index, process, and terms all ship the words in HTML next to `<video>` elements. The risk on the home page is that the live H1 does not answer the query, not that a crawler must run JS to see it.

| Route | Title | Desc | Canon | Robots | H1 | Words | Videos |
|---|---|---|---|---|---|---|---|
| `/` | yes (42) | yes (157) | `/` | index,follow | yes | 1428 | 20 |
| `/services/web-design-edmonton/` | yes (31) | yes (159) | same | index,follow | yes | 668 | 2 |
| `/services/branding/` | yes (43) | yes (142) | same | index,follow | yes | 547 | 2 |
| `/services/print-signage-design/` | yes (45) | yes (143) | same | index,follow | yes | 750 | 2 |
| `/work/` | yes (48) | yes (153) | same | index,follow | yes | 1053 | 8 |
| `/process/` | yes (67) | yes (186) | same | index,follow | yes | 1485 | 1 |
| `/start/` | yes (59) | yes (195) | same | index,follow | yes | 1169 | 0 |
| `/blog/` | yes (39) | yes (161) | same | index,follow | yes | 335 | 2 |
| `/blog/website-that-earns-its-keep-alberta/` | yes (50) | yes (155) | same | **noindex,nofollow** | yes | ~1740 | 0 |
| `/blog/storefront-sign-design-edmonton/` | yes (60) | yes (162) | same | **noindex,nofollow** | yes | 2080 | 0 |
| `/blog/blog-that-ranks-and-brings-leads/` | yes (57) | yes (153) | same | **noindex,nofollow** | yes | 1819 | 0 |
| `/blog/local-advertising-edmonton-alberta/` | yes (53) | yes (156) | same | **noindex,nofollow** | yes | 1736 | 0 |
| `/blog/marketing-campaign-edmonton/` | yes (54) | yes (150) | same | **noindex,nofollow** | yes | 1792 | 0 |
| `/terms/` | yes (42) | yes (173) | same | index,follow | yes | 3145 | 1 |
| `/build-notes/` | yes (27) | yes (159) | same | **absent** (defaults to index) | yes | 1387 | 0 |
| `/menu-lab/` | yes (35) | yes (56) | same | **noindex,nofollow** | yes | 1380 | 0 |
| `/404` | yes (18) | yes (45) | `/404/` | index,follow | yes | 155 | 0 |

Character counts are the decoded strings. Robots values that say `index,follow` also include `max-image-preview:large, max-snippet:-1, max-video-preview:-1`. Descriptions over ~155 characters and titles over ~60 are left for prompt 001 (`/process/` title is 67; `/start/` description is 195).

`dist/sitemap-0.xml` lists 10 URLs: `/`, `/blog/`, `/build-notes/`, `/process/`, the three service pages, `/start/`, `/terms/`, `/work/`. It omits the five noindex field notes, `/menu-lab/`, and `/404`. `/build-notes/` is in the sitemap and has no robots meta.

## Query check

Token must appear in the title, the H1, and the first 100 visible words. Nav chrome is about 16 words on most pages and is included.

| Route | Inferred tokens | In title | In H1 | In first 100 | Flag |
|---|---|---|---|---|---|
| `/` | web design; edmonton | both | neither | neither | **FLAG** — H1 is the line “design Too good to ignore, too real to forget.” Edmonton and “web design” show up later, in the services section, after the marquee repeats. The marquee alone fills most of the first 100 words. |
| `/services/web-design-edmonton/` | web design; edmonton | both | both | both | clear |
| `/services/branding/` | branding; edmonton | both | neither | both (kicker “Edmonton · Branding + identity” sits above the H1) | **FLAG** — H1 is “A brand with a world of its own .” “Logo” is in the title only. |
| `/services/print-signage-design/` | sign; edmonton | both | neither | both (kicker “Edmonton · Storefront + sign design”; “sign” also in the next sentence) | **FLAG** — H1 is “From first sketch to storefront. One clear direction.” |
| `/work/` | work | yes | yes | yes | clear |
| `/process/` | process | yes | yes | yes | clear |
| `/start/` | start | yes | no | yes (nav label START) | **FLAG** — H1 is “Let's make something worth remembering.” The word “start” in the first 100 is the nav item, not the answer. |
| `/blog/` | field notes | yes | yes | yes | clear. Edmonton is in the first 100 (“From Edmonton…”). |
| `/blog/website-that-earns-its-keep-alberta/` | website | yes | yes | yes | clear. Draft, noindex. |
| `/blog/storefront-sign-design-edmonton/` | storefront; sign | both | both | both | clear. Draft, noindex. |
| `/blog/blog-that-ranks-and-brings-leads/` | blog | yes | yes | yes | clear. Draft, noindex. |
| `/blog/local-advertising-edmonton-alberta/` | advertising; edmonton | both | both | both | clear. Draft, noindex. |
| `/blog/marketing-campaign-edmonton/` | marketing; campaign; edmonton | all | all | all | clear. Draft, noindex. |
| `/terms/` | privacy; terms | both | both | both | clear |
| `/build-notes/` | build | title has “built”, not “build” | yes (“Build notes”) | yes | weak. Title is “How we built KR8TIV · Prism”. |
| `/menu-lab/` | menu | yes | yes | yes | clear. noindex sandbox. |
| `/404` | not found | title only | no | no | weak. H1 is “This one got away from us.” The body says the page isn’t here. |

JS / video dependence: **no page fails** the “answer exists only after hydration or only inside the video” test. Copy is live HTML. The home page still fails the query-in-the-first-screen test because the HTML that is there does not say web design or Edmonton until well past the first 100 words.

## Titles, descriptions, H1s

| Route | Title | Meta description | H1 |
|---|---|---|---|
| `/` | Web Design & Branding in Edmonton \| KR8TIV | Edmonton creative studio for branding, websites, immersive visuals, sign design, packaging, and marketing systems that help businesses find customers. | design Too good to ignore, too real to forget. |
| `/services/web-design-edmonton/` | Web Design in Edmonton \| KR8TIV | Founder-led web design in Edmonton. Memorable websites, clear offers and search foundations for Alberta and Canadian businesses. Full websites from $1,200 CAD. | Web design in Edmonton. Built to be remembered. |
| `/services/branding/` | Branding & Logo Design in Edmonton \| KR8TIV | Build a clear brand with KR8TIV in Edmonton. Logo design, visual identity, brand voice, and a system for your website, signage, packaging, and print. | A brand with a world of its own . |
| `/services/print-signage-design/` | Storefront & Sign Design in Edmonton \| KR8TIV | Edmonton storefront, sign and immersive store design. Concepts from about $500 CAD; variable-rate project management across Alberta and Canada. | From first sketch to storefront. One clear direction. |
| `/work/` | Selected Work · Studio Lab · Code Vault — KR8TIV | Honest portfolio. Client work, own-company products, personal R&D, and three GitHub orgs. Every piece tagged for what it actually is — no agency theatre. | Selected work, studio lab, code vault. |
| `/process/` | Our Process · KR8TIV — 9 steps to memorable brand, web, motion & AI | Nine boutique steps from KONTACT to KARE. Zero adult supervision, founder-led craft, 40/40/20 payment split. Book a no-obligation call — we just talk and see if we're a fit. Full AI business solutions included. | Our process Nine steps · Ten clients a year · One person accountable. |
| `/start/` | Start a Project · KR8TIV — free 30-min call or 8-min intake | Start a new brand, web, motion, video or AI project with KR8TIV. Book a free no-obligation call at calendly.com/kr8tiv — or fill out the 10-section intake (auto-saves). We accept crypto and fiat. | Let's make something worth remembering. |
| `/blog/` | Design & Marketing Field Notes \| KR8TIV | Practical design and marketing field notes from an Edmonton studio: websites, storefront signs, campaigns, blogging and local advertising for Alberta businesses. | Field notes. For your next good move. |
| `/blog/website-that-earns-its-keep-alberta/` | When a custom website pays off in Alberta \| KR8TIV | Decide what your Alberta business website needs before a rebuild. Work through costs, buyer questions, local SEO, accessibility, and a safer launch plan. | When does a custom website pay off for an Alberta business? |
| `/blog/storefront-sign-design-edmonton/` | Storefront & sign design in Edmonton: a buyer guide \| KR8TIV | Plan your Edmonton sign and storefront: concept design, immersive store experiences and project management across Alberta and Canada. Pricing and scope explained. | How to design an amazing storefront sign in Edmonton |
| `/blog/blog-that-ranks-and-brings-leads/` | How to build a blog that brings leads in Alberta \| KR8TIV | Turn real customer questions into useful blog posts for Edmonton and Alberta. Learn topic selection, Google AI-search basics, cadence, and lead tracking. | How to create a business blog that earns search traffic and useful enquiries |
| `/blog/local-advertising-edmonton-alberta/` | Local advertising in Edmonton: a useful test \| KR8TIV | Plan local ads for Edmonton and Alberta with honest budgets, better targeting, useful video, and qualified-lead tracking. Build a test before spending more. | How to run local advertising that brings better enquiries in Edmonton |
| `/blog/marketing-campaign-edmonton/` | How to build a marketing campaign in Edmonton \| KR8TIV | Build an Edmonton marketing campaign around a clear offer, useful creative, and qualified enquiries. Includes a worked example and a first-month plan. | How to build a marketing campaign that brings in customers in Edmonton |
| `/terms/` | Privacy Policy + Terms of Service · KR8TIV | KR8TIV Studios privacy policy and terms of service — services, payment, intellectual property, AI integrations, governing law (Alberta, Canada). Last updated August 3, 2026. | The fine print. Privacy · Terms · Honesty first. |
| `/build-notes/` | How we built KR8TIV · Prism | Build notes on the KR8TIV Prism hero: WebGL shader refraction, Lenis + GSAP sync, SVG liquid-glass filter, GSAP 3.13 SplitText with ARIA, Astro 5 island architecture. | Build notes: Prism (VIII) |
| `/menu-lab/` | Menu Lab · preview sandbox — KR8TIV | Internal preview of 11 navigation concepts. Pick a direction. | The menu lab . |
| `/404` | Not found · KR8TIV | That page doesn't exist. Here's the way back. | This one got away from us. |

## First 100 visible words

Shared nav on interior pages starts: `侍 KR8TIV / · 08 HOME DOCTRINE WHY WORK PROCESS NOTES START TERMS 780-915-5471 ⌘ K`.

**`/`** — `侍 design samurai SCROLL TO ENTER (VIII) PRISM 侍 Immersive visuals. A brand that fits. A plan to find your next customer. ON AIR BY APPOINTMENT, BY INSTINCT VIII · PRISM design Too good to ignore, too real to forget. CALL 780-915-5471 STRAIGHT TO MATT · NO PHONE TREE KEEP SCROLLING TEN CLIENTS A YEAR FOUNDER-LED FOUNDER IN EVERY ROOM LUXURY TO CRYPTO WEB3 NATIVE NO ACCOUNT MANAGERS` (the marquee is in the HTML twice, so the next chunk repeats that slogan before doctrine).

**`/services/web-design-edmonton/`** — kicker `Edmonton · Web design`, then the H1, then: a website should feel like the business on its best day; work with Matt; full websites from $1,200 CAD; landing pages from $600 CAD.

**`/services/branding/`** — kicker `Edmonton · Branding + identity`, then the H1, then: the logo is the hello; identity, words, and the places customers meet the business, from a phone screen to the storefront.

**`/services/print-signage-design/`** — kicker `Edmonton · Storefront + sign design`, then the H1, then: a beautiful sign gets you noticed; sign concepts from about $500 CAD; full project management at variable rates.

**`/work/`** — `III / WORK · LIVE INDEX` then the H1, then the honest-inventory paragraph (client work, own company, personal, R&D; one designer-engineer).

**`/process/`** — `Our process` / nine steps / ten clients, then the boutique-attention intro. “Alberta” appears inside the first 100; “Edmonton” does not.

**`/start/`** — `INTAKE · PROJECT REQUEST` then the H1, then the four-required-fields explanation and auto-save note. “Book a free 30-minute call” follows just after this window in `<main>`.

**`/blog/`** — H1, then practical notes for founders, “From Edmonton”, then draft cards including the website and storefront-sign titles.

**Field notes (all five)** — eyebrow `Draft for Matt’s review — not yet published · drafted November 6, 2026`, then the H1, then a direct answer sentence. Storefront, advertising, campaign, and website posts name Edmonton or Alberta in that window. The blog-leads post names Edmonton inside the `<main>` first 100, just after the page-level first 100 (nav pushes it).

**`/terms/`** — H1, last updated August 3, 2026, then the terms intro.

**`/build-notes/`** — H1, Astro 5 / Three.js / GSAP, Matt Haynes, Alberta, then the build-journal lede.

**`/menu-lab/`** — concept list, `DEV PREVIEW · NOT PUBLIC`, then the H1 and the eleven-directions intro.

**`/404`** — `404 · DEAD END`, the H1, then “The page you asked for isn't here”.

## Internal links

Same-origin path links only. Fragments on the same URL, `mailto:`, `tel:`, and off-site URLs (Calendly, LinkedIn, GitHub) are omitted. Trailing slashes normalized. “In” counts other built routes that link here.

| Route | Out (unique built routes) | In |
|---|---|---|
| `/` | work, process, blog, start, terms, web design, branding, print/sign | 16 (every other built page) |
| `/services/web-design-edmonton/` | home, work, process, blog, start, terms, branding, print/sign | 15 |
| `/services/branding/` | home, work, process, blog, start, terms, web design, print/sign | 14 |
| `/services/print-signage-design/` | home, work, process, blog, start, terms, branding, web design, **storefront field note** | 15 |
| `/work/` | home, process, blog, start, terms, three services | 16 |
| `/process/` | home, work, blog, start, terms, three services | 16 |
| `/start/` | home, work, process, blog, terms, **build-notes**, three services | 16 |
| `/blog/` | home, work, process, start, terms, **all five field notes**, three services | 16 |
| each field note | home, work, process, blog, start, terms, three services | 1 (`/blog/`) except storefront, which also gets `/services/print-signage-design/` (in = 2) |
| `/terms/` | home, work, process, blog, start, three services | 16 |
| `/build-notes/` | home, work, process, blog, start, terms | **1** (`/start/` only) |
| `/menu-lab/` | home, work, process, blog, start, terms, three services | **0** |
| `/404` | home, work, process, blog, start, terms, three services | **0** |

Service-to-service links exist (each service page links the other two). The only field-note link from a service page is print/sign → the storefront draft. Home links all three services from the capabilities section. Nothing in the built HTML points at `/menu-lab/` or `/404`. `/build-notes/` is almost an orphan.

Global nav (present on these pages) points at `/`, `#doctrine` or in-page equivalents, `#why` on the home page, `/work/`, `/process/`, `/blog/`, `/start/`, `/terms/`. It does not list the three service URLs; those sit in the footer / services block.

## Flags to carry forward

1. Home H1 and first 100 words do not contain “web design” or “Edmonton”. The answer is in the HTML, but late, under a video hero and a duplicated marquee.
2. Branding and print/sign H1s omit the query and “Edmonton”. The kickers above them do contain both, still inside the first 100 words.
3. `/start/` H1 does not say start / project / Edmonton.
4. Five field notes are `noindex,nofollow` and absent from the sitemap. Correct for drafts. `/blog/` still links them.
5. `/build-notes/` has no robots meta and is in the sitemap. `/menu-lab/` is noindex and not in the sitemap.
6. `/404` is `index,follow` with a self-canonical.
7. No page requires JS or a video decode to expose its H1 or opening answer.
