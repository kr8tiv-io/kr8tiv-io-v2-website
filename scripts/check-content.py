from pathlib import Path
from bs4 import BeautifulSoup
import json,re,xml.etree.ElementTree as ET,yaml
root=Path(__file__).resolve().parents[1];dist=root/'dist';posts=list((root/'src/data/blog').glob('*.md'));assert len(posts)==26
sitemap=ET.parse(dist/'sitemap-0.xml');urls={n.text for n in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
rss=ET.parse(dist/'rss.xml');assert len(rss.findall('.//item'))==26
for f in posts:
 _,front,body=f.read_text().split('---',2);m=yaml.safe_load(front);assert m['draft'] is False;assert not re.search(r'\bgonna\b|meku',body,re.I)
 p=dist/'blog'/m['slug']/'index.html';doc=BeautifulSoup(p.read_text(),'html.parser');assert len(doc.select('h1'))==1,p
 robots=doc.select_one('meta[name=robots]')['content'];assert 'noindex' not in robots,p
 canonical='https://kr8tiv.io/blog/'+m['slug']+'/';assert doc.select_one('link[rel=canonical]')['href']==canonical;assert canonical in urls
 assert doc.select_one('meta[property="og:type"]')['content']=='article';assert doc.select_one('meta[property="og:image:width"]')['content']=='1280';assert doc.select_one('meta[property="og:image:height"]')['content']=='720';assert '/blog/'+m['slug']+'-poster.webp' in doc.select_one('meta[property="og:image"]')['content']
 schemas=[json.loads(n.string) for n in doc.select('script[type="application/ld+json"]')]
 typ=lambda n: n.get('@type')
 article=next(n for n in schemas if typ(n) in ('Article','BlogPosting') or (isinstance(typ(n), list) and ('Article' in typ(n) or 'BlogPosting' in typ(n))))
 if m['slug']=='evolve-eco-blasting-case-study':
  assert typ(article)=='BlogPosting' or (isinstance(typ(article), list) and 'BlogPosting' in typ(article))
 assert article['headline'] and article['image'] and article['publisher']
 faq=next(n for n in schemas if n.get('@type')=='FAQPage');assert len(faq['mainEntity'])==4
 norm=lambda t:t.replace('’',"'").replace('‘',"'").replace('“','\"').replace('”','\"')
 visible=norm(doc.get_text(' ',strip=True))
 for q in faq['mainEntity']:assert norm(q['name']) in visible;assert norm(q['acceptedAnswer']['text']) in visible
 video=doc.select_one('[data-note-video]')
 if m.get('hero_video'):
  assert video and not video.has_attr('src') and not video.has_attr('autoplay') and video.has_attr('muted')
  assert (dist/m['hero_video'].lstrip('/')).is_file()
 else:
  assert video is None
 assert (dist/m['hero_poster'].lstrip('/')).is_file()
 assert '/start' in body[-1200:],f
 lists=doc.select('.fn-related ul');assert lists and len(lists[0].select('li'))==3
 print('PASS',m['slug'])
err=BeautifulSoup((dist/'404.html').read_text(),'html.parser');assert 'noindex' in err.select_one('meta[name=robots]')['content'];assert not any('/404' in u or '/menu-lab' in u for u in urls)
for f in dist.rglob('*.html'):
 doc=BeautifulSoup(f.read_text(),'html.parser')
 for meta in doc.select('script[type="application/ld+json"]'):
  s=json.loads(meta.string);assert 'geo' not in s;assert 'priceRange' not in s
 assert not doc.select('meta[name="ai-content-declaration"]')
print('PASS 26 articles, 104 visible FAQ answers, RSS, sitemap, 404 and conservative schema')

home=BeautifulSoup((dist/'index.html').read_text(),'html.parser')
schemas=[json.loads(n.string) for n in home.select('script[type="application/ld+json"]')]
home_faq=next(n for n in schemas if n.get('@type')=='FAQPage')
home_visible=norm(home.get_text(' ',strip=True))
assert len(home_faq['mainEntity'])==6
assert home.select_one('#faq'), 'homepage FAQ section missing'
for q in home_faq['mainEntity']:
    assert norm(q['name']) in home_visible, q['name']
    assert norm(q['acceptedAnswer']['text']) in home_visible, q['name']
print('PASS homepage FAQ schema matches visible answers')

work=BeautifulSoup((dist/'work/index.html').read_text(),'html.parser');assert len(work.select('.portfolio-card'))==14
for img in work.select('.portfolio-image img'):assert (dist/img['src'].lstrip('/')).is_file()
walkthroughs=work.select('[data-gallery-video]');assert len(walkthroughs)==4
for v in walkthroughs:assert not v.has_attr('src') and not v.has_attr('autoplay') and v.has_attr('muted') and v.has_attr('hidden') and v['preload']=='none'
assert len([p for p in work.select('.portfolio-type') if 'OWN COMPANY / WEBSITE' in p.text])==4
print('PASS 14 distinct gallery displays, 4 deferred real walkthroughs, own-company labels')

home=BeautifulSoup((dist/'index.html').read_text(),'html.parser');mark=home.select_one('.interlude-frame');poster=mark.find('img');video=mark.find('video')
assert poster and poster['loading']=='eager' and 'Design-29-2-1.webp' in poster['src'] and (dist/poster['src'].lstrip('/')).is_file()
video_src=(video['data-src'].lstrip('/').split('?')[0] if video and video.has_attr('data-src') else '')
assert video and not video.has_attr('src') and not video.find('source') and not video.has_attr('autoplay') and (dist/video_src).is_file()
for card in work.select('.portfolio-card'):
 if 'BUSINESS CARDS' in card.get_text():assert card.find('img')['loading']=='eager'
print('PASS independent interlude poster, deferred interlude video and eager business-card art')
