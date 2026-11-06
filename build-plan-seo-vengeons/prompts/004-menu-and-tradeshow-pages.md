---
id: 004-menu-and-tradeshow-pages
title: "Restaurant menu + conference material pages"
kind: implement
effort: high
model: grok-build
depends_on: [003-print-collateral-hub]
---
## goal
Two deep children with distinct intent: `/services/restaurant-menu-design/` and `/services/trade-show-conference-materials/`.
## must_haves
- Each: first-screen answer, deliverables list (menus: dine-in, takeout, boards, QR/digital; conference: booth backdrop, banners, one-pagers, badges, swag, slide template), process, printer/fabricator handoff, FAQ.
- Reference /menu-lab if relevant (keep it noindex if it is a lab). Link up to the hub and across to signage.
- If content can't reach real depth (≥700 distinct words with first-hand detail), keep as hub section instead and note why.
## files
src/pages/services/restaurant-menu-design.astro, src/pages/services/trade-show-conference-materials.astro (new)
## non-goals
No business-card standalone page (hub section only).
## verification
Build passes; no duplicate paragraphs vs hub (diff check).
## commit message
`feat(seo): menu design and conference materials pages`
