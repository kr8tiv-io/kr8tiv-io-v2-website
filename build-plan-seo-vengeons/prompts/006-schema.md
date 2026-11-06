---
id: 006-schema
title: "Structured data"
kind: implement
effort: medium
model: grok-build
depends_on: [004-menu-and-tradeshow-pages]
---
## goal
Valid JSON-LD across the site.
## must_haves
- Organization/ProfessionalService for KR8TIV, areaServed Edmonton, Alberta, Canada; no street address unless already real in source.
- Service + Offer per service page; priceSpecification CAD only for locked prices (minPrice 1200 web, 600 landing, ~500 sign concept).
- FAQPage only where FAQ is visible; BreadcrumbList on services/blog.
## files
layout/SEO component, service pages
## non-goals
No Review/AggregateRating.
## verification
JSON parses for every page; schema.org validator-style check script output in qa.
## commit message
`feat(seo): structured data for services`
