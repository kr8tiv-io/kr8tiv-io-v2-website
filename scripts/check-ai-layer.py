#!/usr/bin/env python3
"""Additive checks for the AI-readable layer. Does not modify the site."""
from pathlib import Path
import json, re, xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
dist = root / "dist"

mirrors = [
    "index.md",
    "about.md",
    "services.md",
    "services/web-design-edmonton.md",
    "services/branding.md",
    "services/print-signage-design.md",
    "services/app-design-edmonton.md",
    "services/ecommerce-website-edmonton.md",
    "services/ads-acquisition-edmonton.md",
    "services/motion-3d-edmonton.md",
    "services/packaging-design-edmonton.md",
    "services/studio-av-production-edmonton.md",
    "services/ux-ui-design-edmonton.md",
    "services/video-editing-edmonton.md",
    "start.md",
    "process.md",
    "work.md",
    "blog.md",
]

required_floors = [
    "$1,950",
    "$850",
    "$1,250",
    "$3,500",
    "$500",
]
# These must appear in the services markdown mirror (same as /services/).
services_md = (root / "public/services.md").read_text(encoding="utf-8")
for floor in required_floors:
    assert floor in services_md, floor

# Stale full-website price must not be presented as a KR8TIV service floor
# in the hand-built layer. Fictional blog examples stay on their HTML pages.
for rel in ["public/llms.txt", "public/llms-full.txt", "public/services.md", "public/index.md"]:
    text = (root / rel).read_text(encoding="utf-8")
    # The draft/layer files should not sell a $1,200 website.
    if re.search(r"websites? (are |start |from |floor )?\$\s*1,200", text, re.I):
        raise SystemExit(f"stale website floor in {rel}")

for rel in mirrors:
    src = root / "public" / rel
    built = dist / rel
    assert src.is_file(), f"missing source {rel}"
    assert built.is_file(), f"missing dist {rel}; run a build first"
    assert "\u2014" not in src.read_text(encoding="utf-8"), f"em dash in {rel}"
    assert "\u2013" not in src.read_text(encoding="utf-8"), f"en dash in {rel}"

# sitemap includes the additive machine-readable URLs
sm = ET.parse(dist / "sitemap-0.xml")
urls = {n.text for n in sm.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc")}
for rel in ["llms.txt", "llms-full.txt", *mirrors]:
    want = "https://kr8tiv.io/" + rel
    assert want in urls, f"sitemap missing {want}"

# Existing HTML routes still present
for path in [
    "https://kr8tiv.io/",
    "https://kr8tiv.io/services/",
    "https://kr8tiv.io/services/web-design-edmonton/",
    "https://kr8tiv.io/start/",
    "https://kr8tiv.io/about/",
    "https://kr8tiv.io/process/",
    "https://kr8tiv.io/work/",
    "https://kr8tiv.io/blog/",
]:
    assert path in urls, path

# No AggregateRating introduced
for html in dist.rglob("*.html"):
    text = html.read_text(encoding="utf-8", errors="replace")
    if "AggregateRating" in text or "aggregateRating" in text:
        raise SystemExit(f"AggregateRating found in {html.relative_to(dist)}")

# Homepage offer catalog still has the original floors and the added ones
home = (dist / "index.html").read_text(encoding="utf-8")
for token in ["850", "1950", "3500", "1250", "1050", "2450"]:
    assert token in home, f"schema price {token} missing from homepage"

print(f"PASS AI-readable layer: {len(mirrors)} markdown mirrors, sitemap entries, no AggregateRating")
