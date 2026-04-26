# kr8tiv-astro

Astro + Vite + pnpm build of the KR8TIV cyber-renaissance design atelier.

## Stack

- **Astro 5** for the static-site shell with zero-JS-by-default component islands
- **Vite + Rollup** (bundled by Astro) for module resolution, tree-shaking, dev HMR
- **Three.js** for the hero liquid-glass shader + future Gaussian splat
- **GSAP 3.13** (SplitText, ScrollTrigger — all free under the 2025 Webflow/GreenSock license)
- **Lenis** for smooth scroll, slaved into GSAP's ticker for buttery 60fps sync
- **TypeScript strict** for build-time safety

## Commands

```bash
pnpm install          # install deps
pnpm dev              # dev server on http://localhost:4321
pnpm build            # static build into ./dist
pnpm preview          # preview the production build
pnpm typecheck        # astro check — catches bad .astro / .ts files
```

## Project layout

```
kr8tiv-astro/
├── astro.config.mjs         # Astro + Vite config, View Transitions, code splitting
├── tsconfig.json            # strict TS, @/ @lib/ @components/ path aliases
├── public/                  # static assets served at /
│   └── kr8tiv-assets/       # videos, images, audio (copied from the legacy Desktop tree)
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro # shared <head>, fonts, nav, grain/noise overlays
│   ├── pages/
│   │   └── index.astro      # the prism splash + doctrine + services + why + work + contact
│   ├── components/          # to be split as the port matures
│   ├── lib/
│   │   ├── reveal.ts        # splash logo pull-through scroll timeline
│   │   ├── prism.ts         # cursor-reactive prism bars
│   │   ├── obelisk.ts       # scroll-scrubbed obelisk video
│   │   ├── audio.ts         # Web Audio analyser + music note pulse
│   │   ├── magnetic.ts      # magnetic cursor on CTAs via gsap.quickTo
│   │   ├── whiteLight.ts    # Easter-egg overlay + W keyboard shortcut
│   │   ├── motionToggle.ts  # a11y motion toggle with localStorage + View Transition
│   │   ├── kineticType.ts   # SplitText + scroll-velocity variable weight
│   │   └── liquidGlass.ts   # Three.js MeshPhysicalMaterial refractive hero (optional island)
│   └── styles/
│       └── core.css         # base typography, colors, grid, nav, shared components
└── dist/                    # build output (gitignored)
```

## The legacy Desktop site

`C:\Users\lucid\Desktop\kr8tiv-v8-prism.html` continues to exist as the working reference.
The Astro port mirrors every feature of that file and adds:
- Real bundling + tree-shaking
- Typed JS
- Component reuse across the v07–v16 variants
- Static build for Vercel / Netlify / Cloudflare Pages
- Hot-module reload during development

## Deploy

Works with zero-config on:
- **Vercel** — `vercel` in this folder
- **Netlify** — drag `dist/` or connect git
- **Cloudflare Pages** — build command `pnpm build`, output `dist`
