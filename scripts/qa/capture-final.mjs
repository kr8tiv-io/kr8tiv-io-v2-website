// Run a copy from /workspace/primetime, where Playwright is already installed.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspace/kr8tiv-io/shots/final';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
async function settleImages(page){
 for(const image of await page.locator('img').all()){
  await image.scrollIntoViewIfNeeded();
  await image.evaluate(async i=>{await i.decode();if(!i.naturalWidth)throw new Error('Empty image '+i.src)});
 }
 await page.evaluate(()=>{window.scrollTo({top:0,behavior:'instant'});return document.fonts.ready});
 await page.waitForFunction(()=>scrollY<2);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}
try{
for(const width of [1440,390]){
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:'reduce'});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 for(const [name,path] of [['gallery','/work/'],['blog-index','/blog/'],['post','/blog/ai-signage-design-edmonton/']]){
  await page.goto('http://localhost:4321'+path,{waitUntil:'load'});await settleImages(page);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path} overflow at ${width}`);
  if(name==='gallery'){
   assert.equal(await page.locator('.portfolio-card').count(),13);
   const shane=page.locator('.portfolio-card').filter({hasText:'Shane Dooley business cards'}).locator('img');
   assert((await shane.evaluate(i=>i.complete&&i.naturalWidth===1600)),'Shane source art must be decoded');
   const file=`${out}/shane-cards-${width}.png`;await shane.screenshot({path:file});results.push({file,width,path:'Shane card artwork'});
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  }
  if(name==='post'){
   assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('[data-note-video]').getAttribute('src'),null);
   assert.equal(await page.locator('.note-hero img').evaluate(i=>i.naturalWidth),1280);
   await page.locator('.note-hero').screenshot({path:`${out}/post-hero-${width}.png`});
  }
  const file=`${out}/${name}-${width}.png`;await page.screenshot({path:file,fullPage:true});results.push({file,width,path,errors:[...errors]});
 }
 await ctx.close();
}
for(const width of [1440,1024,390])for(const motion of ['reduce','no-preference']){
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:1000},reducedMotion:motion});const page=await ctx.newPage();
 await page.goto('http://localhost:4321/',{waitUntil:'load'});
 const frame=page.locator('.interlude-frame');const poster=frame.locator('img');await poster.evaluate(i=>i.decode());
 await page.locator('.interlude-stage').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
 if(motion==='no-preference')await page.waitForFunction(()=>document.querySelector('.interlude-frame')?.classList.contains('is-playing'),null,{timeout:15000});
 else{assert.equal(await frame.locator('video').getAttribute('src'),null);assert.equal(await poster.evaluate(i=>getComputedStyle(i).visibility),'visible');}
 const logo=await frame.evaluate(el=>{const s=getComputedStyle(el),v=el.querySelector('video'),pool=getComputedStyle(el.parentElement.querySelector('.interlude-pool'));return {mask:s.maskImage,shadow:s.boxShadow,background:s.backgroundColor,videoFilter:getComputedStyle(v).filter,blend:getComputedStyle(v).mixBlendMode,readyState:v.readyState,paused:v.paused,currentTime:v.currentTime,pool:pool.backgroundImage}});
 assert.equal(logo.mask,'none');assert.equal(logo.videoFilter,'none');assert.equal(logo.shadow,'none');assert.equal(logo.background,'rgba(0, 0, 0, 0)');assert.equal(logo.blend,'normal');assert(logo.pool.includes('radial-gradient'));
 const suffix=motion==='reduce'?'':'-no-reduced-motion';const file=`${out}/logo-${width}${suffix}.png`;
 await page.screenshot({path:file});await frame.screenshot({path:`${out}/logo-mark-${width}${suffix}.png`});results.push({file,width,motion,logo});await ctx.close();
}
// An actual normal-motion article playback check, separate from poster capture.
const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});const page=await ctx.newPage();await page.goto('http://localhost:4321/blog/ai-signage-design-edmonton/',{waitUntil:'load'});await page.waitForFunction(()=>document.querySelector('[data-note-video]')?.classList.contains('is-playing'),null,{timeout:15000});
const hero=await page.locator('[data-note-video]').evaluate(v=>({readyState:v.readyState,muted:v.muted,paused:v.paused,width:v.videoWidth,height:v.videoHeight}));assert(hero.muted&&!hero.paused&&hero.width>0);await page.locator('.note-hero').screenshot({path:`${out}/post-hero-1440-no-reduced-motion.png`});results.push({hero});await ctx.close();
await writeFile(`${out}/playwright-results.json`,JSON.stringify(results,null,2));console.log('PASS gallery artwork, all image decoding, post heroes and six logo width/motion combinations');
}finally{await browser.close()}
