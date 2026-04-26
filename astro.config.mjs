// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Astro 5 ships view-transitions as a built-in integration and uses
// Vite + Rollup for bundling. Static output so every page is pre-rendered
// at build time — no server needed to host.
export default defineConfig({
  site: 'https://kr8tiv.ai',
  output: 'static',
  // SEO: XML sitemap auto-generated at /sitemap-index.xml during build.
  // Referenced from robots.txt + submitted to Google Search Console.
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: new Date(),
      // Keep /menu-lab/ out of the sitemap (internal preview only).
      filter: (page) => !page.includes('/menu-lab'),
      // Higher priority for the homepage; lower for utility pages.
      serialize(item) {
        if (item.url === 'https://kr8tiv.ai/') return { ...item, priority: 1.0, changefreq: 'daily' };
        if (item.url.includes('/process/')) return { ...item, priority: 0.9 };
        if (item.url.includes('/start/')) return { ...item, priority: 0.9 };
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
