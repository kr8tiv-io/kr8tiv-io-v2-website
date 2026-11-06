---
id: 000-inventory-raw-html
title: "Inventory pages and raw-HTML vs rendered check"
kind: checkpoint
effort: low
model: grok-build
depends_on: []
---
## goal
List every route and confirm H1, first ~100 words, title, meta and canonical exist in built raw HTML (dist/) without JS.
## must_haves
- `npm run build`; for each dist/**/index.html extract title, meta description, canonical, robots, H1, first 100 visible words, internal links out/in.
- Flag pages where answer text depends on JS/video or the query word is missing from title/H1/first 100 words.
## files
qa/vengeons/000-inventory.md (new)
## non-goals
No code changes.
## verification
Table covers all built routes; build exit 0 recorded.
## commit message
`docs(seo): raw-html inventory for vengeons pass`
