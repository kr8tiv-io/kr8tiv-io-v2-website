/**
 * Post-deploy verification: is the LIVE origin actually serving the
 * build we just shipped, and will a returning visitor see it?
 *
 * "The deploy API returned 200" and "the site serves the new bytes" are
 * two different claims. This checks the second, because that is the one
 * users experience:
 *
 *   1. BUILD STAMP. Reads <meta name="x-kr8tiv-build"> from the live
 *      HTML and compares it to the local dist. Matching on copy strings
 *      is a guess — a phrase can exist in two builds. This is exact.
 *   2. CACHE-BUSTED SECOND FETCH. Requests the same URL again with a
 *      random query. If the stamps disagree, some edge is still handing
 *      out an older document.
 *   3. HEADERS. Confirms HTML revalidates. That single header is what
 *      makes a deploy visible immediately instead of up to max-age late.
 *   4. HASHED ASSETS RESOLVE. Fetches the bundle URLs the live HTML
 *      actually references. A 404 there means new HTML but a partial
 *      upload — the worst kind of half-deploy, and invisible if you only
 *      eyeball the homepage.
 *
 * Exits non-zero on failure so CI can gate on it.
 *
 * Usage: node scripts/verify-live.mjs [https://kr8tiv.io]
 */
import fs from 'node:fs';
import path from 'node:path';

const ORIGIN = (process.argv[2] || process.env.VERIFY_URL || 'https://kr8tiv.io').replace(/\/$/, '');
const DIST = path.resolve('dist');

const failures = [];
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { console.log(`  FAIL  ${m}`); failures.push(m); };
const info = (m) => console.log(`  ..    ${m}`);

const stampOf = (html) => (html.match(/<meta\s+name="x-kr8tiv-build"\s+content="([^"]+)"/i) || [])[1] || null;

async function get(url, opts = {}) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'kr8tiv-deploy-verify/1.0', 'Cache-Control': 'no-cache', ...(opts.headers || {}) },
    ...opts,
  });
  return { res, text: opts.method === 'HEAD' ? '' : await res.text() };
}

console.log(`\nVerifying ${ORIGIN}\n`);

let expected = null;
const localIndex = path.join(DIST, 'index.html');
if (fs.existsSync(localIndex)) {
  expected = stampOf(fs.readFileSync(localIndex, 'utf8'));
  info(`local build stamp: ${expected}`);
} else {
  info('no local dist/index.html — skipping stamp comparison');
}

let liveHtml = '';
try {
  const a = await get(`${ORIGIN}/`);
  liveHtml = a.text;
  const liveStamp = stampOf(liveHtml);
  info(`live  build stamp: ${liveStamp}`);

  if (!liveStamp) {
    bad('live HTML has no build stamp — origin is serving a pre-stamp build');
  } else if (expected && liveStamp !== expected) {
    bad(`STALE: live is serving ${liveStamp}, expected ${expected}`);
  } else if (expected) {
    ok(`live is serving the current build (${liveStamp})`);
  }

  const b = await get(`${ORIGIN}/?cachebust=${Date.now()}${Math.random().toString(36).slice(2)}`);
  const bustStamp = stampOf(b.text);
  if (liveStamp && bustStamp && bustStamp !== liveStamp) {
    bad(`cache layer inconsistent: plain=${liveStamp} busted=${bustStamp}`);
  } else if (bustStamp) {
    ok('cache-busted fetch returns the same build (no stale edge)');
  }
} catch (e) {
  bad(`could not fetch ${ORIGIN}/ — ${String(e).slice(0, 120)}`);
}

try {
  const { res } = await get(`${ORIGIN}/`, { method: 'HEAD' });
  const cc = (res.headers.get('cache-control') || '').toLowerCase();
  if (/no-cache|must-revalidate|max-age=0/.test(cc)) ok(`HTML revalidates (${cc})`);
  else bad(`HTML is cacheable without revalidation (${cc || 'no header'}) — deploys will look stale`);
} catch { bad('HEAD / failed'); }

const refs = [...liveHtml.matchAll(/(?:src|href)="(\/_astro\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const uniq = [...new Set(refs)].slice(0, 6);
if (!uniq.length) {
  info('no /_astro/ bundle references found in live HTML');
} else {
  let allOk = true;
  for (const rel of uniq) {
    try {
      const { res } = await get(ORIGIN + rel, { method: 'HEAD' });
      if (!res.ok) { bad(`referenced bundle ${rel} -> ${res.status} (partial upload)`); allOk = false; continue; }
      const cc = (res.headers.get('cache-control') || '').toLowerCase();
      if (!/immutable|max-age=\d{6,}/.test(cc)) {
        info(`bundle ${rel} cache-control is "${cc || 'none'}" (hashed assets should be immutable)`);
      }
    } catch { bad(`bundle ${rel} unreachable`); allOk = false; }
  }
  if (allOk) ok(`all ${uniq.length} referenced bundles resolve on the origin`);
}

console.log('');
if (failures.length) {
  console.log(`RESULT: ${failures.length} problem(s)\n`);
  process.exit(1);
}
console.log('RESULT: live site is serving the current build, caches behaving.\n');
