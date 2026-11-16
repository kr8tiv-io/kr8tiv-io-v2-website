# Deterministic scroll-through: per output frame, set scroll + seek each loop video, screenshot.
import asyncio, sys, os, subprocess, shutil
from playwright.async_api import async_playwright
CH='/home/box/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'
kind=sys.argv[1]; FPS=24
W,H,DPR=(1440,900,1) if kind=='desktop' else (390,844,2)
tmp=f'/tmp/rec2_{kind}'; shutil.rmtree(tmp,ignore_errors=True); os.makedirs(tmp)
SEEK="""async (t)=>{const vs=[...document.querySelectorAll('video.svc-obj')];
 await Promise.all(vs.map(v=>new Promise(r=>{ if(v.readyState<1){r();return;} v.pause(); const tt=t%(v.duration||4);
   if(Math.abs(v.currentTime-tt)<0.001){r();return;} const to=setTimeout(r,800); v.addEventListener('seeked',()=>{clearTimeout(to);r();},{once:true}); v.currentTime=tt;})));}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CH,args=['--autoplay-policy=no-user-gesture-required','--hide-scrollbars'])
        o=dict(viewport={'width':W,'height':H},device_scale_factor=DPR)
        if kind=='mobile': o.update(is_mobile=True,has_touch=True,user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')
        pg=await (await b.new_context(**o)).new_page()
        await pg.goto('http://127.0.0.1:4330/',wait_until='networkidle',timeout=90000); await pg.wait_for_timeout(2000)
        # preload all loops so seeks are instant
        await pg.evaluate("document.querySelectorAll('video.svc-obj').forEach(v=>{v.preload='auto'; v.load();})")
        top=await pg.evaluate("document.getElementById('svc-pin').getBoundingClientRect().top+scrollY")
        await pg.evaluate(f"scrollTo(0,{top})"); await pg.wait_for_timeout(1500)
        dist=await pg.evaluate("document.getElementById('svc-track').scrollWidth-innerWidth")
        await pg.wait_for_function("[...document.querySelectorAll('video.svc-obj')].every(v=>v.readyState>=3)",timeout=60000)
        src=await pg.evaluate("document.querySelector('video.svc-obj').currentSrc"); print(kind,'dist',dist,'src',src)
        start=top-H*0.5; end=top+dist+H*0.15
        lead,hold,per=1.2,1.6,2.2   # seconds: approach, dwell per panel, travel per panel
        frames=[]  # build scroll timeline: approach, then for each panel hold then travel
        def ease(x): return x*x*(3-2*x)
        for i in range(int(lead*FPS)): frames.append(start+(top-start)*ease(i/(lead*FPS)))
        step=dist/10
        for k in range(11):
            frames += [top+k*step]*int(hold*FPS)
            if k<10:
                n=int(per*FPS); frames += [top+k*step+step*ease(i/n) for i in range(n)]
        frames += [top+dist+(end-top-dist)*ease(i/(FPS)) for i in range(FPS)]
        for i,y in enumerate(frames):
            await pg.evaluate(f"scrollTo(0,{y})")
            await pg.wait_for_timeout(60)
            await pg.evaluate(SEEK, i/FPS)
            await pg.screenshot(path=f'{tmp}/{i:05d}.jpg',type='jpeg',quality=92,timeout=120000)
        await b.close()
    out=f'/workspace/kr8tiv-3d/rec/disciplines-scroll-{kind}-v2.mp4'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-i',f'{tmp}/%05d.jpg','-vf','scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
                    '-c:v','libx264','-preset','slow','-crf','22','-movflags','+faststart',out]); print('saved',out,len(frames))
asyncio.run(main())
