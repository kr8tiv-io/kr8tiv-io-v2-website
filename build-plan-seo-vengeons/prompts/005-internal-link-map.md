---
id: 005-internal-link-map
title: "Internal link map"
kind: implement
effort: medium
model: grok-build
depends_on: [003-print-collateral-hub, 004-menu-and-tradeshow-pages]
---
## goal
Push authority from home to service pages and between related pages.
## must_haves
- Write map in qa file: page → 3–5 outgoing links with natural, varied anchors (no repeated exact-match).
- Home service cards link to every service page; each service links to 2 related services + /start; blog posts link to one service.
- No orphan indexable page.
## files
src/pages/**, shared components; qa/vengeons/005-link-map.md
## non-goals
No footer link farms.
## verification
Script over dist/ shows every indexable page has ≥2 inbound internal links.
## commit message
`feat(seo): internal link map`
