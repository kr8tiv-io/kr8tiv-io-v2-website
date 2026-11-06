---
id: 003-print-collateral-hub
title: "Print & collateral hub page"
kind: implement
effort: high
model: grok-build
depends_on: [002-first-screen-answers]
---
## goal
Create `/services/print-collateral-edmonton/` covering business cards, restaurant menus, conference/trade-show material, letterhead & business documents (proposals, decks, invoices templates), brochures, packaging.
## must_haves
- One H2 section per item with id anchors: what we design, files/finishes we hand to printers, how pricing works (quote/variable — no new fixed prices unless in locked list), first-hand process notes.
- Link to /services/print-signage-design/ for storefront/signage and packaging deep section; avoid duplicating its copy (cross-link instead).
- Reuse existing plate/video hero pattern; FAQ with 4–6 real questions.
## files
src/pages/services/print-collateral-edmonton.astro (new); nav/footer entries
## non-goals
No per-city variants; no fake portfolio.
## verification
Build passes; page in nav and footer; ≥600 words distinct from signage page.
## commit message
`feat(seo): print and collateral hub page`
