// Adds /sitemap.xml as a copy of the generated sitemap-0.xml.
// sitemap-index.xml stays the canonical index referenced from robots.txt.
import { copyFileSync, existsSync } from 'node:fs';
const src = 'dist/sitemap-0.xml';
if (existsSync(src)) {
  copyFileSync(src, 'dist/sitemap.xml');
  console.log('sitemap alias: dist/sitemap.xml written');
} else {
  console.warn('sitemap alias: dist/sitemap-0.xml not found, skipped');
}
