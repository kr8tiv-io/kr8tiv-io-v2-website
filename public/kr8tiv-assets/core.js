/* ============================================
   KR8TIV STUDIO — shared core JS
   Requires: Lenis, GSAP, ScrollTrigger already loaded.
   Each variant calls KR8.init(config) after DOM ready.
   ============================================ */
window.KR8 = (function(){
  // Services copy — verbatim from www.kr8tiv.io. `tag` = tagline from the site.
  const SERVICES = [
    { v: 'kr8tiv-assets/2-4.mp4',                      t: 'Website Design',       em:'Website',   desc: 'We build sites that work, look sharp, and say something worth reading.',                                   tag: 'Web Design, Infrastructure Management + Copywriting',              price: '$200+' },
    { v: 'kr8tiv-assets/12_3.mp4',                     t: 'Branding + Identity',  em:'Branding',  desc: 'Build a logo and company brand that captures and holds attention.',                                       tag: 'Logos, Branding Guides, Assets, Style, Story',                     price: '$50+'  },
    { v: 'kr8tiv-assets/12_2.mp4',                     t: 'Video Editing',        em:'Video',     desc: 'Video that stops the scroll and actually gets watched.',                                                  tag: 'Video Editing, Promotional Features + 3D Animation',               price: '$50+'  },
    { v: 'kr8tiv-assets/9-1.mp4',                      t: 'Signage + Displays',   em:'Signage',   desc: 'The physical stuff that makes you look like you have your act together.',                                  tag: 'Signage, Displays, Reports, Pitch Decks, Slides + Merch',          price: '$100+' },
    { v: 'kr8tiv-assets/8-1.mp4',                      t: 'UX/UI + Blockchain',   em:'UX/UI',     desc: 'We design user experiences people love — for web applications, mobile apps.',                              tag: "Blockchain + Cryptocurrency D'APP + NFT Design",                   price: '$500+' },
    { v: 'kr8tiv-assets/7-1.mp4',                      t: 'Industry Design',      em:'Industry',  desc: 'Specialized design for print and digital in luxury real estate, music.',                                  tag: 'Design for Print, Magazines, Music, Real Estate, Travel + Hospitality', price: '$100+' },
    { v: 'kr8tiv-assets/1-1.mp4',                      t: 'Content + Strategy',   em:'Content',   desc: 'From one time single use assets to your content calendar, designed and delivered.',                        tag: 'Content Strategy Planning, Execution + Social Media Assets',       price: '$250+' },
    { v: 'kr8tiv-assets/3-2.mp4',                      t: 'Packaging + Mockups',  em:'Packaging', desc: 'Unboxing is a ritual, not a logistics problem.',                                                          tag: 'Ritual-Level Packaging Design',                                    price: '$300+' },
    { v: 'kr8tiv-assets/web-av-print-main-image-1.mp4',t: 'Ads + Acquisition',    em:'Ads',       desc: 'Built for founders who need customer acquisition systems that scale.',                                    tag: 'Social Media Ads, Customer Acquisition Campaigns',                 price: '$500+' },
    { v: 'kr8tiv-assets/3-4.mp4',                      t: 'Marketing Automation', em:'Systems',   desc: 'We design end-to-end marketing automations that respect your brand voice.',                               tag: 'Marketing Systems, Not Just Pretty Posts',                         price: '$1000+'},
    { v: 'kr8tiv-assets/2-1.mp4',                      t: 'Ecommerce Setups',     em:'Ecom',      desc: 'A customized ecom stack to help you sell anything online.',                                               tag: 'Dropships, Brands & Everything in Between',                        price: '$500+' },
    { v: 'kr8tiv-assets/6-1.mp4',                      t: 'Weaponized Autism',    em:'Wild',      desc: "We're your shop for ideas that create hype and convert customers.",                                       tag: 'Neurodivergent Creative Weapon Systems for Hire',                  price: '$500+' },
  ];

  const WORK = [
    { src: 'kr8tiv-assets/oblisk-kr8tiv.mp4',             num: '/ 001', title: 'Oblisk',         cat: 'LUXURY · FILM' },
    { src: 'kr8tiv-assets/Design-34.mp4',                 num: '/ 002', title: 'Design 34',      cat: 'BRANDING' },
    { src: 'kr8tiv-assets/web-av-print-main-image-1.mp4', num: '/ 003', title: 'Aurora Ventures',cat: 'PRINT · WEB' },
    { src: 'kr8tiv-assets/Design-29-2-1.mp4',             num: '/ 004', title: 'Design 29',      cat: 'ATMOSPHERE' },
    { src: 'kr8tiv-assets/3-4.mp4',                       num: '/ 005', title: 'Study 03',       cat: 'CAMPAIGN' },
    { src: 'kr8tiv-assets/Untitled-design-58.mp4',        num: '/ 006', title: 'Unboxing 58',    cat: 'PACKAGING' },
  ];

  const VARIANTS = [
    { slug: 'v7-obsidian',   num: '07', name: 'OBSIDIAN' },
    { slug: 'v8-prism',      num: '08', name: 'PRISM' },
    { slug: 'v9-magnetic',   num: '09', name: 'MAGNETIC' },
    { slug: 'v10-voltage',   num: '10', name: 'VOLTAGE' },
    { slug: 'v11-silk',      num: '11', name: 'SILK' },
    { slug: 'v12-orbit',     num: '12', name: 'ORBIT' },
    { slug: 'v13-frequency', num: '13', name: 'FREQUENCY' },
    { slug: 'v14-tetra',     num: '14', name: 'TETRA' },
    { slug: 'v15-nightshift',num: '15', name: 'NIGHTSHIFT' },
    { slug: 'v16-broadcast', num: '16', name: 'BROADCAST' },
  ];

  function init(cfg){
    cfg = cfg || {};
    // Lenis — slaved to GSAP's ticker so virtual scroll + animation engine
    // share the exact same frame clock. Also disables lagSmoothing so the
    // engine never silently "catches up" on dropped frames (which is what
    // produces visible jitter on pinned horizontal sections when a tab
    // regains focus or a heavy decode stalls the main thread).
    const lenis = new Lenis({ duration: 1.4, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ({ scroll, limit }) => {
      const pb = document.getElementById('prog'); if (pb) pb.style.width = (scroll/limit*100)+'%';
    });

    // Cursor
    const cur = document.getElementById('cur');
    const curL = document.getElementById('cur-l');
    if (cur) {
      let cx=innerWidth/2, cy=innerHeight/2, tx=cx, ty=cy;
      addEventListener('mousemove', e => { cx=e.clientX; cy=e.clientY; });
      (function tick(){ tx+=(cx-tx)*.2; ty+=(cy-ty)*.2; cur.style.transform=`translate(${tx}px,${ty}px) translate(-50%,-50%)`; requestAnimationFrame(tick); })();
      document.querySelectorAll('a,button,.stmt,input,select,textarea').forEach(el => {
        el.addEventListener('mouseenter', () => cur.classList.add('grow'));
        el.addEventListener('mouseleave', () => cur.classList.remove('grow'));
      });
    }

    // Trail
    const trailCanvas = document.getElementById('trail-canvas');
    if (trailCanvas) {
      const tctx = trailCanvas.getContext('2d');
      function sizeTrail(){ trailCanvas.width = innerWidth; trailCanvas.height = innerHeight; }
      sizeTrail(); addEventListener('resize', sizeTrail);
      const trail = [];
      addEventListener('mousemove', e => { trail.push({ x: e.clientX, y: e.clientY, life: 1 }); if (trail.length > 40) trail.shift(); });
      (function drawTrail(){
        tctx.clearRect(0,0,trailCanvas.width,trailCanvas.height);
        for (let i = 0; i < trail.length; i++) {
          const p = trail[i]; p.life *= 0.92;
          if (p.life < 0.02) continue;
          tctx.beginPath();
          tctx.arc(p.x, p.y, p.life * 7, 0, Math.PI*2);
          tctx.fillStyle = `rgba(${cfg.trailRGB || '61,255,252'}, ${p.life * 0.22})`;
          tctx.fill();
        }
        if (trail.length > 1) {
          tctx.strokeStyle = `rgba(${cfg.trailRGB || '61,255,252'}, 0.1)`;
          tctx.lineWidth = 1;
          tctx.beginPath();
          tctx.moveTo(trail[0].x, trail[0].y);
          for (let i = 1; i < trail.length; i++) tctx.lineTo(trail[i].x, trail[i].y);
          tctx.stroke();
        }
        requestAnimationFrame(drawTrail);
      })();
    }

    // Line reveals
    gsap.utils.toArray('.line > span').forEach(sp => {
      gsap.fromTo(sp, { yPercent: 110 }, { yPercent: 0, duration: 1.15, ease: 'expo.out',
        scrollTrigger: { trigger: sp, start: 'top 92%' }
      });
    });

    // Hero parallax
    gsap.to('.hero-bg video', { scale: 1.1, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }});
    gsap.to('.hero-title', { yPercent: 20, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }});

    // Services: build panels + horizontal pin
    const track = document.getElementById('svc-track');
    if (track) {
      SERVICES.forEach((s, i) => {
        const panel = document.createElement('div');
        panel.className = 'svc-panel';
        panel.innerHTML = `
          <div class="svc-inner">
            <div class="svc-left">
              <div class="svc-num"><span class="b"></span>/ ${String(i+1).padStart(3,'0')} — ${s.tag}</div>
              <h3 class="serif">${s.t.replace('+', '<em>+</em>')}</h3>
              <p>${s.desc}</p>
              <div class="price serif">${s.price}</div>
            </div>
            <div class="svc-frame"><span></span><video muted loop playsinline preload="metadata"><source src="${s.v}" type="video/mp4"></video></div>
          </div>
        `;
        track.appendChild(panel);
      });

      const pin = document.getElementById('svc-pin');
      const totalWidth = SERVICES.length * innerWidth;
      ScrollTrigger.create({
        trigger: pin, start: 'top top',
        end: () => '+=' + (totalWidth - innerWidth),
        pin: true, scrub: 0.8,
        onUpdate: self => {
          track.style.transform = `translateX(${-self.progress * (totalWidth - innerWidth)}px)`;
          const idx = Math.min(SERVICES.length - 1, Math.round(self.progress * (SERVICES.length - 1)));
          const cnt = document.getElementById('svc-cnt'); if (cnt) cnt.textContent = String(idx+1).padStart(2,'0');
        },
        invalidateOnRefresh: true
      });

      // Autoplay visible panel videos
      const panelObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          e.target.querySelectorAll('video').forEach(v => e.isIntersecting ? v.play().catch(()=>{}) : v.pause());
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.svc-panel').forEach(p => panelObs.observe(p));
    }

    // Work grid — simple 6-up
    const wg = document.getElementById('work-grid');
    if (wg) {
      WORK.forEach((w, i) => {
        const tile = document.createElement('div');
        tile.className = 'w-tile';
        tile.innerHTML = `
          <video muted loop playsinline autoplay preload="metadata"><source src="${w.src}" type="video/mp4"></video>
          <div class="w-frame"></div>
          <div class="w-meta">
            <div class="w-idx">${w.num}</div>
            <div class="w-title serif">${w.title}</div>
            <div class="w-cat">${w.cat}</div>
          </div>
        `;
        wg.appendChild(tile);
      });
    }

    // Why pin
    if (document.querySelector('.why')) {
      ScrollTrigger.create({ trigger: '.why', start: 'top top', end: 'bottom bottom', pin: '.why-pin', pinSpacing: false });
      gsap.to('.why-bg video', { scale: 1.15, ease: 'none',
        scrollTrigger: { trigger: '.why', start: 'top top', end: 'bottom top', scrub: true }});
      gsap.utils.toArray('.why-right .q').forEach((q, i) => {
        gsap.fromTo(q, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 1.1, ease: 'power3.out', delay: i*0.14,
          scrollTrigger: { trigger: '.why', start: 'top 62%' }
        });
      });
    }

    // Statements reveal
    gsap.utils.toArray('.stmt').forEach((s, i) => {
      gsap.fromTo(s, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', delay: i*0.06,
        scrollTrigger: { trigger: s, start: 'top 90%' }
      });
    });

    // Process reveal
    gsap.utils.toArray('.step').forEach((s, i) => {
      gsap.fromTo(s, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', delay: i*0.1,
        scrollTrigger: { trigger: '.process', start: 'top 70%' }
      });
    });

    // Reel pin
    if (document.querySelector('.reel')) {
      ScrollTrigger.create({ trigger: '.reel', start: 'top top', end: 'bottom bottom', pin: '.reel-pin', pinSpacing: false });
      gsap.to('.reel-bg video', { scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: '.reel', start: 'top top', end: 'bottom top', scrub: true }});
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-btn');
    const themeIcon = document.getElementById('theme-icon');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        if (themeIcon) themeIcon.innerHTML = next === 'light'
          ? '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
          : '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>';
      });
    }

    // Music toggle — real kr8tiv.io track via <audio> by default,
    // falls back to a synth pad if cfg.musicSrc === null
    const musicBtn = document.getElementById('music-btn');
    let musicOn = false;
    const musicSrc = (cfg.musicSrc === undefined) ? 'kr8tiv-assets/kr8tiv-music.mp3' : cfg.musicSrc;

    // If a src is provided, use <audio> element (real track).
    // Also expose a Web Audio analyser for audio-reactive variants.
    let audioEl = null, ac = null, master = null, srcNode = null, analyser = null;
    function setupTrack(){
      audioEl = document.createElement('audio');
      audioEl.src = musicSrc;
      audioEl.loop = true;
      audioEl.crossOrigin = 'anonymous';
      audioEl.preload = 'auto';
      audioEl.volume = 0;
      document.body.appendChild(audioEl);
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        srcNode = ac.createMediaElementSource(audioEl);
        master = ac.createGain(); master.gain.value = 1;
        analyser = ac.createAnalyser(); analyser.fftSize = 256;
        srcNode.connect(analyser); analyser.connect(master); master.connect(ac.destination);
        window.KR8AUDIO = { ac, master, analyser,
          getLevel: () => {
            if (!analyser) return 0;
            const d = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(d);
            let s = 0; for (let i=0;i<d.length;i++) s += d[i];
            return (s / d.length) / 255;
          }
        };
      } catch(e){}
    }

    // Synth-pad fallback (for variants that explicitly opt out with musicSrc:null)
    function setupPad(){
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 500; filter.Q.value = 1.3;
      filter.connect(master);
      const delay = ac.createDelay(); delay.delayTime.value = 0.3;
      const fb = ac.createGain(); fb.gain.value = 0.42;
      filter.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master);
      const freqs = cfg.musicFreqs || [110, 110.4, 164.8, 220, 164.8*1.01];
      freqs.forEach(f => {
        const o = ac.createOscillator(); o.frequency.value = f; o.type = 'sine';
        const g = ac.createGain(); g.gain.value = 1 / freqs.length;
        o.connect(g); g.connect(filter); o.start();
      });
      const lfo = ac.createOscillator(); lfo.frequency.value = 0.06; lfo.type = 'sine';
      const lfoGain = ac.createGain(); lfoGain.gain.value = 160;
      lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
      window.KR8AUDIO = { ac, master, getLevel: () => master.gain.value };
    }

    if (musicBtn) {
      musicBtn.addEventListener('click', () => {
        if (musicSrc) {
          if (!audioEl) setupTrack();
          if (ac && ac.state === 'suspended') ac.resume();
          musicOn = !musicOn;
          musicBtn.classList.toggle('on', musicOn);
          // ramp volume
          const target = musicOn ? 0.55 : 0;
          const steps = 24, dur = musicOn ? 2.2 : 1.0;
          const start = audioEl.volume;
          let i = 0;
          const iv = setInterval(() => {
            i++;
            audioEl.volume = Math.max(0, Math.min(1, start + (target - start) * (i/steps)));
            if (i >= steps) clearInterval(iv);
          }, (dur * 1000) / steps);
          if (musicOn) audioEl.play().catch(() => {
            // Some browsers still need an extra gesture — the click itself should satisfy it
          });
          else setTimeout(() => { try { audioEl.pause(); } catch(e){} }, dur * 1000 + 200);
        } else {
          if (!ac) setupPad();
          if (ac.state === 'suspended') ac.resume();
          musicOn = !musicOn;
          const now = ac.currentTime;
          master.gain.cancelScheduledValues(now);
          master.gain.setValueAtTime(master.gain.value, now);
          master.gain.linearRampToValueAtTime(musicOn ? 0.05 : 0, now + (musicOn ? 2.5 : 1.2));
          musicBtn.classList.toggle('on', musicOn);
        }
      });
    }

    // Form
    const form = document.getElementById('form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = document.getElementById('submit'); const orig = btn.textContent;
        btn.textContent = 'Sending…'; btn.disabled = true;
        setTimeout(() => {
          btn.textContent = '✓ Brief received';
          setTimeout(() => { btn.textContent = orig; btn.disabled = false; e.target.reset(); }, 3000);
        }, 900);
      });
    }

    // Variant bar — inject links for navigating between variants
    const vb = document.getElementById('variant-bar');
    if (vb) {
      VARIANTS.forEach(v => {
        const a = document.createElement('a');
        a.href = `kr8tiv-${v.slug}.html`;
        a.textContent = v.num;
        a.title = v.name;
        if (location.pathname.includes(v.slug)) a.className = 'current';
        vb.appendChild(a);
      });
    }

    return { lenis, SERVICES, WORK, VARIANTS };
  }

  return { init, SERVICES, WORK, VARIANTS };
})();
