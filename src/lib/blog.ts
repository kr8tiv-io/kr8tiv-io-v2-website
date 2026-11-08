/* Field Notes — markdown lives in src/data/blog (copied from kr8tiv-marketing/blog).
   Draft truth: `draft: true` posts render for local review only, carry noindex,
   and are kept out of the sitemap. Never show a "published" date until Matt releases. */
export interface Post {
  slug: string; title: string; seo_title?: string; meta_description: string; excerpt: string;
  publish_date: string; draft: boolean; status: string; author: string;
  hero_alt: string; hero_poster: string; hero_video: string; tags: string[];
  faq?: { question: string; answer: string }[];
  Content: any;
}
const mods = import.meta.glob('../data/blog/*.md', { eager: true }) as Record<string, any>;
export const posts: Post[] = Object.values(mods)
  .map((m) => ({ ...m.frontmatter, Content: m.Content }))
  .sort((a, b) => (a.slug === 'website-that-earns-its-keep-alberta' ? -1 : b.slug === 'website-that-earns-its-keep-alberta' ? 1 : a.slug === 'storefront-sign-design-edmonton' ? -1 : 0));
export const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
