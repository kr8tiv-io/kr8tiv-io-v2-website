# Interlude logo: original animation back, black blended outward (9 November 2026)

## What went wrong

- `dbdf8f4` (Nov 6, "soft interlude pool") put an edge **mask on the video itself** (`.interlude-frame` mask-image in `blend.css`). That inward fade ate the K and V.
- `5ae67b3` (Nov 8, "Fix interlude poster race and black matte", shipped in PR #5 / `cb7cef8`) swapped the original `Design-29-2-1.mp4` for a keyed derivative, `kr8tiv-chrome-transparent.webm` / `posters/kr8tiv-chrome-transparent.webp` (made by `scripts/qa/make-interlude-media.py` with ffmpeg `colorkey=0x000000` plus a near-black alpha ramp). Keying removed the dark, fine edge detail of the chrome along with the backdrop, so on the purple page the letters looked chopped, scratchy and weathered.

## What changed

- `InterludeMark.astro` plays the **original** `Design-29-2-1.mp4` (H.264, black ground, untouched) with the original `posters/Design-29-2-1.webp` still. The alpha-support probe is gone because the original needs no alpha.
- `blend.css` adds `.interlude-halo`, a pure-black (`#000`, the loop's own black) layer the size of the media, **behind** it. Its box-shadow spread is 3 sigma of its blur, so the black is 99.9% opaque at the media edge (no seam, even with the screenshot brightened 4x) and feathers only **outside** the animation into the page. A second, wider layer gives the fade a long tail. Sizes use `cqw` of the frame, so phones and 2560 px screens look the same.
- Nothing masks, filters, blends or overlays the animation in dark mode.
- Light mode inverts the whole plate (media and halo), so the ground and its feather become white and melt into the paper. The old `multiply` could not reach the page field from inside `<main>`'s stacking context and showed a white box.
- The old `.interlude-pool` is hidden when the new markup is present. The keyed WebM/WebP and their script stay in the repo, unused.
- Net weight: the interlude video drops from 1.5 MB (VP9 alpha) to 232 KB (original MP4).

## Verified

- Build and `astro check` pass. `scripts/qa/media-regression.mjs` passes.
- Playwright Chromium at 1440, 1920, 2560 and 390 (dark and light), three frames each, plus reduced motion: the video plays the original MP4, every letter is intact, there's no rectangle edge and no inward vignette.
