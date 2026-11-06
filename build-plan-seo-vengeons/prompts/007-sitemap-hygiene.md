---
id: 007-sitemap-hygiene
title: "Sitemap and indexing hygiene"
kind: implement
effort: low
model: grok-build
depends_on: [004-menu-and-tradeshow-pages]
---
## goal
Sitemap lists only canonical indexable pages.
## must_haves
- Exclude noindex drafts, /menu-lab, /build-notes, 404, terms if noindex; include new pages.
- Canonicals self-referencing with trailing slash; robots.txt points to sitemap.
## files
astro.config.*, public/robots.txt
## non-goals
No GSC submission (parent/Matt).
## verification
Diff sitemap URLs vs pages with robots index — zero mismatch.
## commit message
`fix(seo): sitemap and canonical hygiene`
