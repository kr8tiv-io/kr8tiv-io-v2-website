import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});let failures=0;
try{
 for(const width of [1440,1024]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await page.goto('http://localhost:4321/',{waitUntil:'load'});
  try{assert.equal(await page.locator('.interlude-frame > img').count(),1,'Independent, always-rendered logo poster is required');await page.locator('.interlude-frame > img').evaluate(i=>i.decode());assert.equal(await page.locator('.interlude-frame video').getAttribute('src'),null);console.log('PASS static logo',width)}catch(e){console.error('FAIL static logo',width,e.message);failures++}await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await page.goto('http://localhost:4321/work/',{waitUntil:'load'});
 try{const img=page.locator('.portfolio-card').filter({hasText:'Shane Dooley business cards'}).locator('img');assert.equal(await img.getAttribute('loading'),'eager','Business-card artwork must not be deferred past a full-page gallery capture');await img.evaluate(i=>i.decode());assert((await img.evaluate(i=>i.naturalWidth))>0);console.log('PASS Shane real artwork')}catch(e){console.error('FAIL Shane real artwork',e.message);failures++}
 const post=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await post.goto('http://localhost:4321/blog/ai-signage-design-edmonton/',{waitUntil:'load'});try{const img=post.locator('.note-hero img');await img.evaluate(i=>i.decode());const actual=await img.evaluate(i=>i.naturalWidth);assert.equal(Number(await img.getAttribute('width')),actual,'Hero intrinsic dimensions must match real poster');assert.equal(Number(await post.locator('meta[property=\"og:image:width\"]').getAttribute('content')),actual,'OG dimensions must match real poster');console.log('PASS hero dimensions')}catch(e){console.error('FAIL hero dimensions',e.message);failures++}
}finally{await browser.close()}
process.exitCode=failures?1:0;
