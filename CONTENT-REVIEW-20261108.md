# KR8TIV content review — 8 November 2026

## Local result

Integrated into the public-source clone at `site/`, branch `content/nov8` (baseline 7335116). All ten articles are in the existing Markdown/Field Notes format and rendered into `site/dist`; no publishing was performed.

- Five new guides revised; five existing articles fact-checked and expanded with decision worksheets, comparison/acceptance tests and FAQs. All ten have draft false, production indexing intent, four visible FAQs each, Article + FAQPage JSON-LD, tailored metadata/OG images/canonicals/alt text and related links. No article is flagged unfinished editorially; Matt's final approval is still required.
- All ten have newly generated silent six-second MP4 hero loops and optimized WebP posters. Video source is deferred on phones, reduced-motion, Save-Data, site motion-off and off-screen states; poster remains usable without JavaScript. Actual browser behavior and motion aesthetics still need browser QA. No temporary hero placeholders were needed.
- Interlude mask removed; supplied outward-only shadow applied. Video darkening filter removed. CSS/build inspection passed; final 1440/390 visual confirmation is pending.
- Gallery uses one component on home and work pages: opaque framed 16:10 images and consistent type. Ten websites plus three business-card displays; no duplicate URLs.
- RSS contains ten posts. Sitemap contains ten post URLs and excludes preview/404. 404 is noindex,follow. Unconfirmed coordinates, priceRange and conflicting founding date are omitted; original values remain in history. llms.txt now uses the correct .io navigation links. Human-only authorship assertion removed. Existing crawler allow/block policies preserved.

## Articles

Word counts are rendered body whitespace counts, excluding YAML; they include source lists and FAQ text. Titles and counts do not count navigation or the common CTA.

| Title | Slug | Words |
|---|---|---:|
| How to design remarkable signage with AI—without building an expensive mistake | `ai-signage-design-edmonton` | 2137 |
| How to use AI to design a storefront layout that works beyond the render | `ai-storefront-layout-design-edmonton` | 2248 |
| How to use AI for vehicle wraps that look good on the actual vehicle | `ai-vehicle-wrap-design-edmonton` | 2316 |
| How to create a business blog that earns search traffic and useful enquiries | `blog-that-ranks-and-brings-leads` | 1917 |
| How to run local advertising that brings better enquiries in Edmonton | `local-advertising-edmonton-alberta` | 1824 |
| How to build a marketing campaign that brings in customers in Edmonton | `marketing-campaign-edmonton` | 1886 |
| How to design packaging that stands out—and still works when it is printed | `packaging-design-that-stands-out-canada` | 2211 |
| How to attract customers with signage they can actually use | `signage-that-attracts-customers-edmonton` | 2175 |
| How to design an amazing storefront sign in Edmonton | `storefront-sign-design-edmonton` | 2168 |
| When does a custom website pay off for an Alberta business? | `website-that-earns-its-keep-alberta` | 1840 |

## Gallery and link verification

`npm run test:gallery` checked real HTTP GETs for all ten external websites and three local preview artwork URLs. All 13 returned 200. This checks HTTP reachability, not visual correctness or ownership.

| Display | Destination | HTTP |
|---|---|---:|
| 2240 Speed Shop | https://2240speedshop.com/ | 200 |
| Evolve Eco Blasting | https://www.evolveecoblasting.com/ | 200 |
| Final Finish Epoxy | https://lightgrey-wasp-945457.hostingersite.com/ | 200 |
| AntiHero | https://antihero.community/ | 200 |
| PrimeTime Contractors | https://orange-wolverine-521574.hostingersite.com/ | 200 |
| Shane Dooley Roofing Guru | https://shaneroofingguru.com/ | 200 |
| Aurora Ventures | https://auroraventures.agency/ | 200 |
| Meet Your KIN | https://meetyourkin.com/ | 200 |
| KR8TIV AI | https://kr8tiv.ai/ | 200 |
| KR8TIV | https://kr8tiv.io/ | 200 |
| KR8TIV business cards | /kr8tiv-assets/portfolio/03-foil-business-cards.webp | 200 |
| Evolve Eco Blasting business cards | /kr8tiv-assets/portfolio/evolve-business-cards.webp | 200 |
| Shane Dooley business cards | /kr8tiv-assets/portfolio/shane-business-cards.webp | 200 |

Both Final Finish and PrimeTime websites are clearly labelled staging. Final Finish uses the newest lightgrey staging URL and its real hero capture, from the earlier public-site review. Evolve and Shane use real homepage images instead of dimmed walkthrough frames. Evolve, Shane and Aurora retain their real supplied walkthroughs as deferred desktop-hover video; mobile/reduced-motion/Save-Data keep the poster, and videos pause offscreen. Shane’s paired original print faces remain one additional design-system display. Own-company attribution is explicit for Aurora, KIN and both KR8TIV sites. Aurora/KIN/KR8TIV ventures retain their current site destinations. Jarvis identity remains unresolved and Pinky + Brain's old destination returned 402: hidden from the current gallery, originals preserved in `review-archive` / existing source data.

## Business-card provenance and remaining PrimeTime dependency

- Evolve final fitted-border suite: Matt's sent message `19dc5dc8d1646198`, subject “Finished business cards fitted borders for print”, 25 April 2026, Todd thread `19dc5d4536b6c98e`. Four linked originals downloaded through DownloadFile; chosen industrial front 3 plus mountain reverse 4, displayed as one design-system card. This is a design judgement among supplied versions, not a claim only that version was approved. Todd's follow-up praised the set.
- The later “Aaron's business card” message `19ebf5c1f4a4cfb0` was also inspected; downloaded front 5 is clearly Evolve, not PrimeTime. Earlier V2 ZIP retained. No email sent and no financial/invoice attachment used.
- KR8TIV: supplied foil mockup used for the gallery. Exact Desktop PDFs `brushed-metal-v5-front.pdf` and `back-v7-wizard-print-bleed.pdf` copied unchanged from Matt's PC and rendered with poppler under `card-candidates/pdf-renders/`. These originals remain available for review, not exposed as a directory listing on the site.
- PrimeTime: latest instruction is DO include a card. The Todd card selections found so far are Evolve, not PrimeTime. No PrimeTime business-card artwork was confidently identified. The copied Desktop PrimeTime Update 03 PDF is a design-direction report, not a business card. The zero-byte Desktop PrimeTime Design Direction PDF was not copied. PrimeTime's website card IS included; its business-card slot is held hidden pending the actual selection. Need the exact email or supplied artwork. Pick the real PrimeTime variant most like its white scaffolding splash page; do not mislabel the Evolve industrial front.

## Verification

- Fresh `npm ci && npm run build`: exit 0, 22 static pages.
- `npm run typecheck`: 0 errors, 0 warnings, 3 existing inline-script hints.
- `npm run test:content`: ten articles, forty visible FAQ answers with semantic schema parity, indexing metadata, hero assets, RSS, sitemap and 404 checks passed.
- `npm run test:gallery`: 13/13 HTTP 200.
- ffprobe: all ten compressed loops have video-only streams, H264, faststart; about 6.04 seconds, 848×480. Posters are 1024×576.
- Dependency compatibility: original npm ci failed (MDX 5.0.6 peer Astro ^6 vs installed Astro 5.18.2). Changed MDX to compatible ^4.3.14, regenerated lock, and clean installation/build passed. No force/legacy-peer-deps used.
- SECURITY FOLLOW-UP: npm audit reports 13 vulnerabilities (1 critical, 10 high, 1 moderate, 1 low), including Astro's AVIF optimization advisory. Not represented as a security-clean stack. Framework-major upgrades are outside this content task. Astro preview was stopped; current review server is a loopback-only plain static file server. See `qa/npm-audit.json`.

## Browser screenshots — not complete

No final local-build screenshots were captured. Do not represent this task as fully visually signed off. Browser/desktop interaction requires a delegated browser executor, and this run had no dispatch/subagent tool. A prepared Playwright capture/assertion script is at `qa/capture-final.mjs` and has NOT been executed.

Target folder: `/workspace/kr8tiv-io/shots/final/` (contains `PENDING.md`, not proof images). Required outputs still pending: gallery, logo, blog-index and one post at both 1440 and 390 widths. Parent should delegate the local preview at http://localhost:4321/ for captures and actual visual review. Test normal desktop video playback, reduced motion, Save-Data, touch/mobile fallback and no horizontal overflow.

Prior real project captures used as sources: `shots/site-review/`, notably `lightgrey-wasp-945457.hostingersite.com.png`. No new capture of that external site was made in this run.

## Files and owner decisions

- Built output: `site/dist/`.
- Exact changed/new built-file list: `deploy/CHANGED.md`; baseline full build preserved in `baseline-dist-20261108/`; original snapshot untouched.
- Current article/media manifests: `content-package/article-manifest.json`, `media/manifest.json`. Some earlier package metadata snapshots are reference copies; the site source/built output and this manifest are authoritative.
- Fact-check ledger: `content-package/FACT-CHECK.md`.
- Generated media visual overview: `content-package/media/hero-contact-sheet.jpg`.
- Matt needed: final article/design approval, actual PrimeTime card selection, any corrections to business-card contact details, confirmation before adding a precise business location or founding date.
- Parent needed: sanctioned browser QA/screenshots and technical security review.
- Publication dates currently use the planned 8 November 2026 release. Update/rebuild if the actual release date differs. No ranking, indexing, assistant citation or business-result guarantees. Search Console verification is separate.

No email sent, no public post, no push, no deploy and no Hostinger upload.
