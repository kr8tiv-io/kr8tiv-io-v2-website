/* Field Notes — markdown lives in src/data/blog (copied from kr8tiv-marketing/blog).
   Draft truth: `draft: true` posts render for local review only, carry noindex,
   and are kept out of the sitemap. Never show a "published" date until Matt releases. */
export interface Post {
  slug: string; title: string; seo_title?: string; meta_description: string; excerpt: string;
  publish_date: string; updated?: string; draft: boolean; status: string; author: string;
  hero_alt: string; hero_poster: string; hero_video: string; tags: string[]; related_slugs?: string[];
  faq?: { question: string; answer: string }[];
  Content: any; rawContent?: () => string;
}
const mods = import.meta.glob('../data/blog/*.md', { eager: true }) as Record<string, any>;
export const posts: Post[] = Object.values(mods)
  .map((m) => ({ ...m.frontmatter, Content: m.Content, rawContent: m.rawContent }))
  .sort((a, b) => (a.slug === 'website-that-earns-its-keep-alberta' ? -1 : b.slug === 'website-that-earns-its-keep-alberta' ? 1 : a.slug === 'storefront-sign-design-edmonton' ? -1 : 0));
export const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

/* Related notes: explicit related_slugs first, then the posts sharing the most tags. */
export function relatedPosts(post: Post, n = 3): Post[] {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const picked: Post[] = (post.related_slugs ?? []).map((s) => bySlug.get(s)).filter((p): p is Post => !!p && !p.draft);
  const score = (p: Post) => p.tags.filter((t) => post.tags.includes(t) && !['Edmonton', 'Alberta'].includes(t)).length;
  const rest = posts.filter((p) => p.slug !== post.slug && !p.draft && !picked.includes(p)).sort((a, b) => score(b) - score(a));
  return [...picked, ...rest].slice(0, n);
}
/* Service pages a note relates to, from its tags. */
const SERVICE_LINKS: { match: RegExp; href: string; label: string }[] = [
  { match: /web|seo|blog|small business|case study/i, href: '/services/web-design-edmonton/', label: 'Web design in Edmonton' },
  { match: /brand|packag|vehicle|small business/i, href: '/services/branding/', label: 'Branding and identity' },
  { match: /sign|storefront|retail|packag|vehicle/i, href: '/services/print-signage-design/', label: 'Storefront, sign and print design' }
];
export function serviceLinksFor(post: Post) {
  const tags = post.tags.join(' ');
  const hits = SERVICE_LINKS.filter((l) => l.match.test(tags));
  return hits.length ? hits : [SERVICE_LINKS[0]];
}
