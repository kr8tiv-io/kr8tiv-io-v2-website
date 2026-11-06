---
id: 008-blog-publish-gate-and-collateral-posts
title: "Field notes publish gate + collateral drafts"
kind: implement
effort: high
model: grok-build
depends_on: [005-internal-link-map]
---
## goal
Posts become indexable only when they prove a human did it; add collateral drafts.
## must_haves
- Frontmatter gate: `author`, `firstHand: true`, `serviceLink`, `reviewedByMatt: true` required to drop noindex; build fails otherwise.
- New drafts (stay noindex): Business cards people keep (Edmonton); Restaurant menu design that sells margin items; Conference booth kit checklist; Letterhead & business docs that look like your brand; Storefront sign concept → fabricator → install in Alberta; Packaging on a small-run budget.
- Each draft has `TODO(Matt)` slots for real photos/numbers; no invented stories.
## files
blog content collection + schema, blog pages
## non-goals
Do not flip any post live.
## verification
Build passes; all posts still noindex; gate test shows failure when field missing.
## commit message
`feat(blog): publish gate and collateral drafts`
