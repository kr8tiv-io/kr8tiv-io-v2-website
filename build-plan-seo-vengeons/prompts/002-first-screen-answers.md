---
id: 002-first-screen-answers
title: "First screen answers the query"
kind: implement
effort: medium
model: grok-build
depends_on: [000-inventory-raw-html]
---
## goal
Above the fold on home and each service page: H1 with query, 1–2 sentence answer (what + who + Edmonton), starting price, primary CTA to /start.
## must_haves
- Text in server HTML, layered over video plates with poster fallback; readable contrast (pink accent per Matt), reduced-motion respected.
- Keep existing voice; no filler.
## files
src/pages/index.astro, src/pages/services/*.astro, hero component
## non-goals
No new video generation.
## verification
Screenshots 1440 and 390 wide; raw HTML contains answer sentence before first video tag-dependent content.
## commit message
`feat(seo): first-screen answers on money pages`
