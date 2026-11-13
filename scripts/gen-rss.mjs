// Regenerates public/rss.xml from the Field Notes frontmatter before each build,
// so new or updated posts never drift out of the feed. Drafts are skipped.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = 'src/data/blog';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const field = (src, k) => {
  const m = src.match(new RegExp('^' + k + ':\\s*(.*(?:\\n {2,}.*)*)', 'm'));
  return m ? m[1].replace(/\n\s+/g, ' ').trim().replace(/^['"]|['"]$/g, '') : '';
};
const tags = (src) => { const m = src.match(/^tags:\n((?:- .*\n)+)/m); return m ? m[1].trim().split('\n').map((l) => l.slice(2).trim()) : []; };
const items = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
  const src = readFileSync(`${dir}/${f}`, 'utf8').split(/^---$/m)[1];
  return { slug: field(src, 'slug'), title: field(src, 'title'), desc: field(src, 'meta_description'), date: field(src, 'publish_date'), draft: /^draft:\s*true/m.test(src), tags: tags(src) };
}).filter((p) => !p.draft && p.slug).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
const site = 'https://kr8tiv.io';
const last = items[0]?.date;
const xml = `<?xml version='1.0' encoding='UTF-8'?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>KR8TIV Field Notes</title>
    <link>${site}/blog/</link>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Practical design and marketing guides from KR8TIV in Edmonton, Alberta.</description>
    <language>en-ca</language>
${last ? `    <lastBuildDate>${new Date(last + 'T16:00:00Z').toUTCString()}</lastBuildDate>\n` : ''}${items.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${site}/blog/${p.slug}/</link>
      <description>${esc(p.desc)}</description>
      <guid isPermaLink="true">${site}/blog/${p.slug}/</guid>
      <author>matt@kr8tiv.io (Matt Haynes)</author>
      <pubDate>${new Date(p.date + 'T16:00:00Z').toUTCString()}</pubDate>
${p.tags.map((t) => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`).join('\n')}
  </channel>
</rss>
`;
writeFileSync('public/rss.xml', xml);
console.log(`rss: ${items.length} items written to public/rss.xml`);
