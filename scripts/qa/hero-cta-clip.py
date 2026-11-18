#!/usr/bin/env python3
"""Assert the home-page call pill and caption stay fully inside the hero.

Usage:
  python3 scripts/qa/hero-cta-clip.py --url http://127.0.0.1:4321/ --out /tmp/hero-cta-shots

Exit 0 on pass, 1 on any failing viewport or page error.
Requires the machine Playwright (python3 -m playwright) with Chromium.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

VIEWPORTS = [
    ("1280x720", 1280, 720),
    ("1366x768", 1366, 768),
    ("1440x800", 1440, 800),
    ("1536x864", 1536, 864),
    ("1280x650", 1280, 650),
    ("1920x1080", 1920, 1080),
    ("390x844", 390, 844),
]

MIN_GAP = 16.0

MEASURE_JS = """
() => {
  const hero = document.querySelector('.hero.hero-reveal');
  const row = document.querySelector('.hero-call-row');
  const call = document.querySelector('.hero-call');
  const sub = document.querySelector('.hero-call-sub');
  const entity = document.querySelector('.entity-line');
  const bar = document.querySelector('.variant-bar');
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: r.top, right: r.right, bottom: r.bottom, left: r.left,
      width: r.width, height: r.height,
      opacity: parseFloat(cs.opacity),
      overflow: cs.overflow,
      visibility: cs.visibility,
      display: cs.display,
    };
  };
  const heroBox = box(hero);
  const rowBox = box(row);
  const callBox = box(call);
  const subBox = box(sub);
  const entityBox = box(entity);
  const barBox = box(bar);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const subVisible = !!(subBox && subBox.display !== 'none' && subBox.width > 0 && subBox.height > 0);
  const ctaBottom = Math.max(
    rowBox ? rowBox.bottom : 0,
    callBox ? callBox.bottom : 0,
    subVisible && subBox ? subBox.bottom : 0,
  );
  return {
    scrollY: window.scrollY,
    innerWidth: vw,
    innerHeight: vh,
    uiOpacity: document.querySelector('.hero-ui')
      ? parseFloat(getComputedStyle(document.querySelector('.hero-ui')).opacity)
      : 0,
    hero: heroBox,
    row: rowBox,
    call: callBox,
    sub: subBox,
    subVisible,
    entity: entityBox,
    bar: barBox,
    ctaBottom,
    gapHero: (heroBox && ctaBottom) ? (heroBox.bottom - ctaBottom) : null,
    gapEntity: (entityBox && ctaBottom) ? (entityBox.top - ctaBottom) : null,
    gapViewport: ctaBottom ? (vh - ctaBottom) : null,
    gapBar: (barBox && barBox.display !== 'none' && barBox.opacity > 0.05 && ctaBottom)
      ? (barBox.top - ctaBottom) : null,
  };
}
"""

SCROLL_JS = """
async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();
    if (window.__lenis && typeof window.__lenis.stop === 'function') window.__lenis.stop();
  } catch (e) {}
  document.documentElement.classList.add('motion-off');
  const jump = (y) => { window.scrollTo(0, y); };
  let found = null;
  for (let y = 0; y <= 4000; y += 200) {
    jump(y);
    await wait(40);
    const ui = document.querySelector('.hero-ui');
    const op = ui ? parseFloat(getComputedStyle(ui).opacity) : 0;
    if (op > 0.95) { found = { jumpedTo: y, opacity: op, scrollY: window.scrollY }; break; }
  }
  if (!found) return { ok: false, scrollY: window.scrollY };
  // Nudge so the entity line is just entering the bottom of the viewport.
  const entity = document.querySelector('.entity-line');
  if (entity) {
    const r = entity.getBoundingClientRect();
    const target = window.scrollY + (r.top - (window.innerHeight - 48));
    jump(Math.max(0, target));
    await wait(200);
  }
  return { ok: true, ...(found || {}), scrollY: window.scrollY };
}
"""


def check(m: dict, name: str, width: int) -> list[str]:
    fails = []
    if m.get("uiOpacity", 0) < 0.95:
        fails.append(f"{name}: hero UI not visible (opacity={m.get('uiOpacity')})")
        return fails
    call = m.get("call") or {}
    row = m.get("row") or {}
    hero = m.get("hero") or {}
    if not call or call.get("width", 0) < 8 or call.get("height", 0) < 8:
        fails.append(f"{name}: call pill missing or zero size")
        return fails
    if call.get("opacity", 0) < 0.95 or call.get("visibility") == "hidden":
        fails.append(f"{name}: call pill not visible")
    # Caption is intentionally hidden at max-width 420px.
    if width > 420:
        sub = m.get("sub") or {}
        if not m.get("subVisible"):
            fails.append(f"{name}: caption should be visible at width {width}")
        elif sub.get("opacity", 0) < 0.4:
            fails.append(f"{name}: caption opacity too low")
    gap_hero = m.get("gapHero")
    if gap_hero is None or gap_hero < MIN_GAP:
        fails.append(
            f"{name}: CTA is not fully inside the hero with {MIN_GAP:.0f}px clearance "
            f"(gapHero={gap_hero})"
        )
    gap_entity = m.get("gapEntity")
    entity = m.get("entity") or {}
    vh = m.get("innerHeight") or 0
    entity_in_view = bool(entity) and entity.get("top", 10**9) < vh and entity.get("bottom", -1) > 0
    if entity_in_view and (gap_entity is None or gap_entity < MIN_GAP):
        fails.append(
            f"{name}: CTA overlaps or is closer than {MIN_GAP:.0f}px to the next section "
            f"(gapEntity={gap_entity})"
        )
    # If the 01-10 rail is on screen and overlapping the CTA, fail.
    gap_bar = m.get("gapBar")
    bar = m.get("bar") or {}
    bar_on = (
        bar
        and bar.get("display") != "none"
        and bar.get("opacity", 0) > 0.05
        and bar.get("top", 10**9) < vh
        and bar.get("bottom", -1) > 0
        and bar.get("width", 0) > 0
    )
    if bar_on and gap_bar is not None and gap_bar < 0:
        fails.append(f"{name}: CTA is overlapped by the 01-10 section rail (gapBar={gap_bar})")
    return fails


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:4321/")
    ap.add_argument("--out", default="/tmp/hero-cta-shots")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    results = []
    failures: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for name, w, h in VIEWPORTS:
            page_errors: list[str] = []
            ctx = browser.new_context(viewport={"width": w, "height": h}, reduced_motion="reduce")
            page = ctx.new_page()
            page.on("pageerror", lambda e: page_errors.append(str(e)))
            page.goto(args.url, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(600)
            jump = page.evaluate(SCROLL_JS)
            page.wait_for_timeout(300)
            meas = page.evaluate(MEASURE_JS)
            page.screenshot(path=str(out / f"hero-cta-{name}.png"), full_page=False)
            page.screenshot(
                path=str(out / f"hero-cta-crop-{name}.png"),
                clip={"x": 0, "y": max(0, h - 280), "width": w, "height": min(280, h)},
            )
            rec = {"viewport": name, "jump": jump, "measure": meas, "page_errors": page_errors}
            results.append(rec)
            if not jump.get("ok"):
                failures.append(f"{name}: could not scroll the splash reveal to the hero UI")
            failures.extend(check(meas, name, w))
            if page_errors:
                failures.append(f"{name}: page errors: {page_errors}")
            ctx.close()
        browser.close()

    (out / "metrics.json").write_text(json.dumps(results, indent=2))
    if failures:
        print("FAIL")
        for f in failures:
            print(" -", f)
        return 1
    print("PASS")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
