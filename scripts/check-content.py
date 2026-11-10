from pathlib import Path
from bs4 import BeautifulSoup
import json,re,xml.etree.ElementTree as ET,yaml
root=Path(__file__).resolve().parents[1];dist=root/'dist';posts=list((root/'src/data/blog').glob('*.md'))
loaded=[]
for f in posts:
    _,front,body=f.read_text().split('---',2);m=yaml.safe_load(front);m['_body']=body;loaded.append(m)
published=[m for m in loaded if m['draft'] is False]
drafts=[m for m in loaded if m['draft'] is True]
assert len(published)==10, f'expected 10 published posts, got {len(published)}'
sitemap=ET.parse(dist/'sitemap-0.xml');urls={n.text for n in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
rss=ET.parse(dist/'rss.xml');assert len(rss.findall('.//item'))==10
for m in loaded:
    body=m['_body'];assert not re.search(r'\bgonna\b|meku',body,re.I)
    pth=dist/'blog'/m['slug']/'index.html';doc=BeautifulSoup(pth.read_text(),'html.parser');assert len(doc.select('h1'))==1,pth
    robots=doc.select_one('meta[name=robots]')['content']
    canonical='https://kr8tiv.io/blog/'+m['slug']+'/'
    assert doc.select_one('link[rel=canonical]')['href']==canonical
    if m['draft'] is False:
        assert 'noindex' not in robots,pth
        assert canonical in urls
    else:
        assert 'noindex' in robots,pth
        assert canonical not in urls
    assert doc.select_one('meta[property="og:type"]')['content']=='article';assert doc.select_one('meta[property="og:image:width"]')['content']=='1280';assert doc.select_one('meta[property="og:image:height"]')['content']=='720';assert '/blog/'+m['slug']+'-poster.webp' in doc.select_one('meta[property="og:image"]')['content']
    schemas=[json.loads(n.string) for n in doc.select('script[type="application/ld+json"]')];article=next(n for n in schemas if n.get('@type')=='Article');assert article['headline'] and article['image'] and article['publisher']
    faq=next(n for n in schemas if n.get('@type')=='FAQPage');assert len(faq['mainEntity'])==4
    norm=lambda t:t.replace('’',"'").replace('‘',"'").replace('“','\"').replace('”','\"')
    visible=norm(doc.get_text(' ',strip=True))
    for q in faq['mainEntity']:assert norm(q['name']) in visible;assert norm(q['acceptedAnswer']['text']) in visible
    video=doc.select_one('[data-note-video]');assert video and not video.has_attr('src') and not video.has_attr('autoplay') and video.has_attr('muted')
    for attr in ['hero_poster','hero_video']:assert (dist/m[attr].lstrip('/')).is_file()
    assert '/start' in body[-1200:],m['slug']
    assert len(doc.select('.fn-related li'))==3
    print('PASS',m['slug'], 'DRAFT' if m['draft'] else 'LIVE')
err=BeautifulSoup((dist/'404.html').read_text(),'html.parser');assert 'noindex' in err.select_one('meta[name=robots]')['content'];assert not any('/404' in u or '/menu-lab' in u for u in urls)
for f in dist.rglob('*.html'):
 doc=BeautifulSoup(f.read_text(),'html.parser')
 for meta in doc.select('script[type="application/ld+json"]'):
  s=json.loads(meta.string);assert 'geo' not in s;assert 'priceRange' not in s
 assert not doc.select('meta[name="ai-content-declaration"]')
print('PASS', len(published), 'published articles,', len(drafts), 'drafts, 4 FAQs each, RSS stays at 10, drafts noindexed and out of sitemap')

work=BeautifulSoup((dist/'work/index.html').read_text(),'html.parser');assert len(work.select('.portfolio-card'))==13
for img in work.select('.portfolio-image img'):assert (dist/img['src'].lstrip('/')).is_file()
walkthroughs=work.select('[data-gallery-video]');assert len(walkthroughs)==3
for v in walkthroughs:assert not v.has_attr('src') and not v.has_attr('autoplay') and v.has_attr('muted') and v.has_attr('hidden') and v['preload']=='none'
assert len([p for p in work.select('.portfolio-type') if 'OWN COMPANY / WEBSITE' in p.text])==4
print('PASS 13 distinct gallery displays, 3 deferred real walkthroughs, own-company labels')

home=BeautifulSoup((dist/'index.html').read_text(),'html.parser');mark=home.select_one('.interlude-frame');poster=mark.find('img');video=mark.find('video')
assert poster and poster['loading']=='eager' and 'transparent.webp' in poster['src'] and (dist/poster['src'].lstrip('/')).is_file()
assert video and not video.has_attr('src') and not video.find('source') and not video.has_attr('autoplay') and (dist/video['data-src'].lstrip('/')).is_file()
for card in work.select('.portfolio-card'):
 if 'BUSINESS CARDS' in card.get_text():assert card.find('img')['loading']=='eager'
print('PASS independent transparent logo fallback, deferred alpha video and eager business-card art')
