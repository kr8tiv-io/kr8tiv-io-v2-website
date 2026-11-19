// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

// Real per-post dates for <lastmod>. A single build timestamp on every URL
// (what the sitemap used to emit) tells Google nothing, and Google ignores
// lastmod from sites where it is not consistently accurate.
// Windows checkouts save Field Notes as CRLF. A slug regex that stops
// at \n but not \r stores "slug\r", then lastmod and the draft filter
// both miss. Normalize before matching. GitHub Actions is LF, which is
// why production can look fine while a local Windows build drops dates.
const readBlog = (f) => readFileSync('./src/data/blog/' + f, 'utf8').replace(/\r\n/g, '\n');
const blogSlug = (src) => (src.match(/^slug:\s*["']?([^"'\r\n]+)["']?/m) || [])[1]?.trim();

const blogLastmod = Object.fromEntries(
  readdirSync('./src/data/blog')
    .filter((f) => f.endsWith('.md'))
    .map((f) => readBlog(f))
    .map((src) => [
      blogSlug(src),
      (src.match(/^updated:\s*'?([0-9-]{10})/m) || src.match(/^publish_date:\s*'?([0-9-]{10})/m) || [])[1]
    ])
    .filter(([slug, d]) => slug && d)
);
const latestBlogDate = Object.values(blogLastmod).sort().pop();

// Field Notes drafts render locally (noindex) but stay out of the sitemap
// until Matt releases them (frontmatter `draft: false`).
const draftBlogSlugs = readdirSync('./src/data/blog')
  .filter((f) => f.endsWith('.md'))
  .map((f) => readBlog(f))
  .filter((src) => /^draft:\s*true/m.test(src))
  .map((src) => blogSlug(src))
  .filter(Boolean);

// Astro 5 ships view-transitions as a built-in integration and uses
// Vite + Rollup for bundling. Static output so every page is pre-rendered
// at build time — no server needed to host.
export default defineConfig({
  site: 'https://kr8tiv.io',
  output: 'static',
  // SEO: XML sitemap auto-generated at /sitemap-index.xml during build.
  // Referenced from robots.txt + submitted to Google Search Console.
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.8,
      // Additive: machine-readable files that are not Astro routes.
      customPages: [
        'https://kr8tiv.io/llms.txt',
        'https://kr8tiv.io/llms-full.txt',
        'https://kr8tiv.io/index.md',
        'https://kr8tiv.io/about.md',
        'https://kr8tiv.io/services.md',
        'https://kr8tiv.io/services/web-design-edmonton.md',
        'https://kr8tiv.io/services/branding.md',
        'https://kr8tiv.io/services/print-signage-design.md',
        'https://kr8tiv.io/services/app-design-edmonton.md',
        'https://kr8tiv.io/services/ecommerce-website-edmonton.md',
        'https://kr8tiv.io/services/ads-acquisition-edmonton.md',
        'https://kr8tiv.io/services/motion-3d-edmonton.md',
        'https://kr8tiv.io/services/packaging-design-edmonton.md',
        'https://kr8tiv.io/services/studio-av-production-edmonton.md',
        'https://kr8tiv.io/services/ux-ui-design-edmonton.md',
        'https://kr8tiv.io/services/video-editing-edmonton.md',
        'https://kr8tiv.io/start.md',
        'https://kr8tiv.io/process.md',
        'https://kr8tiv.io/work.md',
        'https://kr8tiv.io/blog.md'
      ],
      // Keep /menu-lab/ out of the sitemap (internal preview only).
      filter: (page) => !page.includes('/404') && !page.includes('/menu-lab') && !draftBlogSlugs.some((s) => page.includes('/blog/' + s + '/')),
      // Higher priority for the homepage; lower for utility pages.
      serialize(item) {
        // lastmod: real post dates only; omit it where we have no honest date.
        const m = item.url.match(/\/blog\/([^/]+)\/$/);
        if (m && blogLastmod[m[1]]) item = { ...item, lastmod: new Date(blogLastmod[m[1]] + 'T12:00:00Z').toISOString() };
        else if (item.url.endsWith('/blog/') && latestBlogDate) item = { ...item, lastmod: new Date(latestBlogDate + 'T12:00:00Z').toISOString() };
        else { const { lastmod, ...rest } = item; item = rest; }
        if (item.url === 'https://kr8tiv.io/') return { ...item, priority: 1.0, changefreq: 'daily' };
        if (item.url.includes('/process/')) return { ...item, priority: 0.9 };
        if (item.url.includes('/start/')) return { ...item, priority: 0.9 };
        if (item.url.includes('/services/')) return { ...item, priority: 0.9 };
        // Google ignores <priority>. This only keeps the file honest:
        // terms is a legal page, not a buying page.
        if (item.url.includes('/terms/')) return { ...item, priority: 0.3 };
        return item;
      }
    })
  ],
  build: {
    format: 'directory',         // /work/ instead of /work.html — matches Vercel defaults
    inlineStylesheets: 'auto'    // small CSS is inlined for LCP
  },
  image: {
    // sharp is the default; turns .png/.jpg imports into responsive AVIF/WebP at build
    service: { entrypoint: 'astro/assets/services/sharp' }
  },
  vite: {
    build: {
      // Split Three.js + GSAP into their own chunks so the tiny pages
      // (contact, foot) don't pull a 200kB WebGL bundle they don't need.
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three'],
            gsap: ['gsap']
          }
        }
      }
    },
    ssr: {
      // three.js has ESM quirks that need bundled-by-Vite treatment at SSR-time
      noExternal: ['three']
    }
  }
});
