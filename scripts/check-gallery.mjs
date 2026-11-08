import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const cards=JSON.parse(readFileSync(new URL('../src/data/gallery.json',import.meta.url),'utf8'));
const results=await Promise.all(cards.map(async c=>{
 if(!c.url.startsWith('http')){assert(existsSync(new URL('../dist'+c.url,import.meta.url)),c.name+' built asset missing');const r=await fetch((process.env.GALLERY_BASE_URL??'http://localhost:4321')+c.url,{signal:AbortSignal.timeout(10000)});await r.body?.cancel();return {name:c.name,url:c.url,status:r.status,check:'HTTP GET local preview + built asset'};}
 try{const r=await fetch(c.url,{redirect:'follow',signal:AbortSignal.timeout(30000)});await r.body?.cancel();return {name:c.name,url:c.url,status:r.status,finalUrl:r.url,check:'HTTP GET'};}catch(e){return {name:c.name,url:c.url,status:0,error:String(e)}}
}));
console.log(JSON.stringify(results,null,2));writeFileSync(new URL('../gallery-link-results.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
assert.equal(new Set(cards.map(c=>c.url)).size,cards.length,'No duplicate destinations');
for(const r of results)assert.equal(r.status,200,r.name+' must return 200');
