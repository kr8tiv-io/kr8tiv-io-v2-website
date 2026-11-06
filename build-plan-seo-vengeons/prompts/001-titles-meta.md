---
id: 001-titles-meta
title: "Click-winning titles and meta"
kind: implement
effort: medium
model: grok-build
depends_on: [000-inventory-raw-html]
---
## goal
Rewrite title/meta on indexable pages to win the click for real queries.
## must_haves
- Input: GSC top queries per page `{paste}`. If empty, use intent and add `NEEDS-GSC` note in qa file — never invent impressions/CTR.
- Title ≤60 chars: query + benefit/price hook + "| KR8TIV"; meta ≤155 chars with Edmonton/Alberta and next step. Price only from locked list.
- Each page targets one distinct primary query (no cannibalising).
## files
src/pages/**/*.astro (title/description props); qa/vengeons/001-titles.md
## non-goals
No layout changes, no new pages.
## verification
Build passes; table old→new with lengths; no duplicate titles.
## commit message
`feat(seo): click-focused titles and meta`
