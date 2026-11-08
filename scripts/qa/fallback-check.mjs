import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const scenario of ['blocked-video','no-javascript']){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference',javaScriptEnabled:scenario!=='no-javascript'});const page=await ctx.newPage();
  if(scenario==='blocked-video')await page.route('**/kr8tiv-chrome-transparent.webm',r=>r.abort());
  await page.goto('http://localhost:4321/',{waitUntil:'load'});const frame=page.locator('.interlude-frame');const image=frame.locator('img');await image.evaluate(i=>i.decode());await frame.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  if(scenario==='blocked-video')await page.waitForFunction(()=>document.querySelector('[data-interlude-video]')?.error);
  assert.equal(await image.evaluate(i=>getComputedStyle(i).visibility),'visible');assert.equal(await frame.evaluate(e=>e.classList.contains('is-playing')),false);const file=`/workspace/kr8tiv-io/shots/final/logo-1440-${scenario}.png`;await page.screenshot({path:file});results.push({scenario,file,posterVisible:true});await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});const page=await ctx.newPage();await page.goto('http://localhost:4321/',{waitUntil:'load'});await page.locator('.interlude-frame').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('.interlude-frame')?.classList.contains('is-playing'));await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('[data-interlude-video]')?.paused&&!document.querySelector('.interlude-frame')?.classList.contains('is-playing'));results.push({scenario:'live-reduced-motion-change',posterVisible:true,videoPaused:true});await ctx.close();
 await writeFile('/workspace/kr8tiv-io/shots/final/fallback-results.json',JSON.stringify(results,null,2));console.log('PASS blocked-video, no-JavaScript and live reduced-motion poster fallback');
}finally{await browser.close()}
