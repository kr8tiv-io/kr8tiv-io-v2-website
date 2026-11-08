from pathlib import Path
from bs4 import BeautifulSoup
import json,re,xml.etree.ElementTree as ET,yaml
root=Path(__file__).resolve().parents[1];dist=root/'dist';posts=list((root/'src/data/blog').glob('*.md'));assert len(posts)==10
sitemap=ET.parse(dist/'sitemap-0.xml');urls={n.text for n in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
rss=ET.parse(dist/'rss.xml');assert len(rss.findall('.//item'))==10
for f in posts:
 _,front,body=f.read_text().split('---',2);m=yaml.safe_load(front);assert m['draft'] is False;assert not re.search(r'\bgonna\b|meku',body,re.I)
 p=dist/'blog'/m['slug']/'index.html';doc=BeautifulSoup(p.read_text(),'html.parser');assert len(doc.select('h1'))==1,p
 robots=doc.select_one('meta[name=robots]')['content'];assert 'noindex' not in robots,p
 canonical='https://kr8tiv.io/blog/'+m['slug']+'/';assert doc.select_one('link[rel=canonical]')['href']==canonical;assert canonical in urls
 assert doc.select_one('meta[property="og:type"]')['content']=='article';assert '/blog/'+m['slug']+'-poster.webp' in doc.select_one('meta[property="og:image"]')['content']
 schemas=[json.loads(n.string) for n in doc.select('script[type="application/ld+json"]')];article=next(n for n in schemas if n.get('@type')=='Article');assert article['headline'] and article['image'] and article['publisher']
 faq=next(n for n in schemas if n.get('@type')=='FAQPage');assert len(faq['mainEntity'])==4
 norm=lambda t:t.replace('’',"'").replace('‘',"'").replace('“','\"').replace('”','\"')
 visible=norm(doc.get_text(' ',strip=True))
 for q in faq['mainEntity']:assert norm(q['name']) in visible;assert norm(q['acceptedAnswer']['text']) in visible
 video=doc.select_one('[data-note-video]');assert video and not video.has_attr('src') and not video.has_attr('autoplay') and video.has_attr('muted')
 for attr in ['hero_poster','hero_video']:assert (dist/m[attr].lstrip('/')).is_file()
 assert '/start' in body[-1200:],f
 assert len(doc.select('.fn-related li'))==3
 print('PASS',m['slug'])
err=BeautifulSoup((dist/'404.html').read_text(),'html.parser');assert 'noindex' in err.select_one('meta[name=robots]')['content'];assert not any('/404' in u or '/menu-lab' in u for u in urls)
for f in dist.rglob('*.html'):
 doc=BeautifulSoup(f.read_text(),'html.parser')
 for meta in doc.select('script[type="application/ld+json"]'):
  s=json.loads(meta.string);assert 'geo' not in s;assert 'priceRange' not in s
 assert not doc.select('meta[name="ai-content-declaration"]')
print('PASS 10 articles, 40 visible FAQ answers, RSS, sitemap, 404 and conservative schema')
