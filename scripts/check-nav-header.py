#!/usr/bin/env python3
"""Guard the kr8tiv.io nav lockup, mid links, progress readout and call pill.

Checks 1024, 1280, 1366, 1440, 1536 and 1920 at the top of the page and
at 100% scroll. Fails if the brand lockup wraps or shrinks, if mid links
(when visible) touch the brand, the progress divider or the pill, if the
readout overlaps the pill, or if the control row overflows the viewport.

Usage:
  python3 scripts/check-nav-header.py [URL]

Default URL is http://127.0.0.1:4365/ (override with the argument or
NAV_CHECK_URL). Media requests are aborted so the check stays fast.
"""
from __future__ import annotations

import json
import os
import sys

from playwright.sync_api import sync_playwright

DEFAULT_URL = os.environ.get("NAV_CHECK_URL", "http://127.0.0.1:4365/")
WIDTHS = (1024, 1280, 1366, 1440, 1536, 1920)
# One-line lockup is 22px tall and 219.6px wide; the wordmark is 66px.
MAX_BRAND_HEIGHT = 26
MIN_BRAND_WIDTH = 210
MIN_MARK_WIDTH = 60
MIN_GAP = 16  # comfortable gap between brand, mid, and progress
MIN_PILL_GAP = 8
MIN_RIGHT_PAD = 24

MEASURE_JS = r"""
() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      left: +r.left.toFixed(2),
      right: +r.right.toFixed(2),
      top: +r.top.toFixed(2),
      bottom: +r.bottom.toFixed(2),
      w: +r.width.toFixed(2),
      h: +r.height.toFixed(2),
      display: cs.display,
      opacity: cs.opacity,
      position: cs.position,
      whiteSpace: cs.whiteSpace,
      flexShrink: cs.flexShrink
    };
  };
  const nav = document.querySelector('nav');
  const brand = document.querySelector('nav .brand');
  const mark = document.querySelector('nav .brand-mark');
  const mid = document.querySelector('.nav-mid');
  const prog = document.querySelector('.nav-progress');
  const call = document.querySelector('.nav-call');
  const navR = document.querySelector('.nav-r');
  const midVisible = !!(mid && getComputedStyle(mid).display !== 'none' && mid.getBoundingClientRect().width > 0);
  const progVisible = !!(prog && getComputedStyle(prog).display !== 'none' && parseFloat(getComputedStyle(prog).opacity) > 0.01);
  const midLinks = mid ? [...mid.querySelectorAll('a')].map((a) => {
    const r = a.getBoundingClientRect();
    return { t: (a.textContent || '').trim().split(/\s+/)[0], left: +r.left.toFixed(2), right: +r.right.toFixed(2), top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
  }) : [];
  return {
    navState: nav ? nav.getAttribute('data-nav-state') : null,
    viewport: innerWidth,
    brand: box(brand),
    mark: box(mark),
    mid: box(mid),
    midVisible,
    midLinks,
    prog: box(prog),
    progVisible,
    progText: prog ? (prog.textContent || '').trim() : '',
    call: box(call),
    navR: box(navR)
  };
}
"""


def gap(a, b):
    if not a or not b:
        return None
    return round(b["left"] - a["right"], 2)


def overlap(a, b, pad=0.5):
    if not a or not b:
        return None
    ox = min(a["right"], b["right"]) - max(a["left"], b["left"])
    oy = min(a["bottom"], b["bottom"]) - max(a["top"], b["top"])
    if ox > pad and oy > pad:
        return {"ox": round(ox, 2), "oy": round(oy, 2)}
    return None


def main() -> int:
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    failures = []
    rows = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get("CHROME_PATH", "/usr/bin/google-chrome"),
            args=["--no-sandbox", "--disable-dev-shm-usage"],
            headless=True,
        )
        for width in WIDTHS:
            context = browser.new_context(viewport={"width": width, "height": 900})
            page = context.new_page()
            page.set_default_timeout(30000)
            page.route("**/*.{mp4,webm,mov,mp3,wav,m4a}", lambda route: route.abort())
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_selector("nav", timeout=15000)
            page.wait_for_timeout(600)
            for scroll_name, frac in (("top", 0.0), ("100", 1.0)):
                page.evaluate(
                    """(frac) => {
                      const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
                      window.scrollTo(0, frac === 1 ? max : Math.round(max * frac));
                    }""",
                    frac,
                )
                page.wait_for_timeout(500)
                data = page.evaluate(MEASURE_JS)
                data["width"] = width
                data["scroll"] = scroll_name
                rows.append(data)
                label = f"{width} {scroll_name}"
                brand, mark, mid, prog, call, navR = (
                    data["brand"], data["mark"], data["mid"], data["prog"], data["call"], data["navR"]
                )

                if not brand or not call or not navR:
                    failures.append(f"{label}: missing brand, call pill or control row")
                    continue

                if brand["h"] > MAX_BRAND_HEIGHT:
                    failures.append(
                        f"{label}: brand lockup wrapped (height {brand['h']}px, max {MAX_BRAND_HEIGHT})"
                    )
                if brand["w"] < MIN_BRAND_WIDTH:
                    failures.append(
                        f"{label}: brand lockup shrank (width {brand['w']}px, min {MIN_BRAND_WIDTH})"
                    )
                if mark and mark["display"] != "none" and mark["w"] < MIN_MARK_WIDTH:
                    failures.append(
                        f"{label}: wordmark shrank (width {mark['w']}px, min {MIN_MARK_WIDTH})"
                    )
                if brand.get("whiteSpace") != "nowrap":
                    failures.append(f"{label}: brand white-space is {brand.get('whiteSpace')!r}, expected nowrap")

                links = data.get("midLinks") or []
                first = links[0] if links else None
                last = links[-1] if links else None
                # Mid is a stretched 1fr row. Measure the first and last
                # link, not the container, so a packed 1280 and a spacious
                # 1920 are both judged on the visible glyphs.
                if data["midVisible"] and first and last:
                    bg = gap(brand, first)
                    if bg is None or bg < MIN_GAP:
                        failures.append(
                            f"{label}: mid links too close to brand (gap {bg}, min {MIN_GAP})"
                        )
                    if overlap(brand, first):
                        failures.append(f"{label}: mid links overlap the brand")
                    if mid["h"] > 28:
                        failures.append(f"{label}: mid links wrapped (height {mid['h']}px)")
                    if prog and prog["display"] != "none" and prog["w"] > 0:
                        pg = gap(last, prog)
                        if pg is None or pg < MIN_GAP:
                            failures.append(
                                f"{label}: mid links too close to the progress readout (gap {pg}, min {MIN_GAP})"
                            )
                        if overlap(last, prog):
                            failures.append(f"{label}: mid links overlap the progress readout")
                    if overlap(last, call) or overlap(first, call):
                        failures.append(f"{label}: mid links overlap the call pill")

                if prog and prog["display"] != "none" and prog["w"] > 0:
                    pc = gap(prog, call)
                    if overlap(prog, call) or (pc is not None and pc < MIN_PILL_GAP):
                        failures.append(
                            f"{label}: progress readout overlaps or crowds the call pill (gap {pc})"
                        )

                if navR["right"] > width - MIN_RIGHT_PAD + 0.5:
                    failures.append(
                        f"{label}: control row overflows the viewport (right {navR['right']}, width {width})"
                    )
                if brand["left"] < -0.5:
                    failures.append(f"{label}: brand overflows the left edge")

            context.close()
        browser.close()

    if failures:
        print("FAIL nav header")
        for line in failures:
            print(" -", line)
        sys.stderr.write(json.dumps({"failures": failures, "rows": rows}, indent=2) + "\n")
        return 1

    print("PASS nav header")
    for row in rows:
        links = row.get("midLinks") or []
        first = links[0] if links else None
        last = links[-1] if links else None
        mid_gap_brand = gap(row["brand"], first) if row["midVisible"] and first else "hidden"
        mid_gap_prog = gap(last, row["prog"]) if row["midVisible"] and last else "hidden"
        print(
            f"  {row['width']} {row['scroll']} state={row['navState']} "
            f"brand={row['brand']['w']}x{row['brand']['h']} "
            f"mark={row['mark']['w'] if row['mark'] else None} "
            f"mid-brand={mid_gap_brand} mid-prog={mid_gap_prog} "
            f"prog-call={gap(row['prog'], row['call'])} "
            f"prog={row['progText']!r}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
