"""Rebuild only derived alpha assets; never alter the supplied originals."""
from pathlib import Path
from PIL import Image, ImageChops
import subprocess
root=Path(__file__).resolve().parents[2]
assets=root/'public/kr8tiv-assets'
poster=Image.open(assets/'posters/Design-29-2-1.webp').convert('RGB')
r,g,b=poster.split();peak=ImageChops.lighter(ImageChops.lighter(r,g),b)
alpha=peak.point(lambda v:int(max(0,min(255,(v-3)/7*255))))
poster.putalpha(alpha)
poster.save(assets/'posters/kr8tiv-chrome-transparent.webp',lossless=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(assets/'Design-29-2-1.mp4'),'-vf','format=rgba,colorkey=0x000000:0.015:0.02,format=yuva420p,setsar=1','-an','-c:v','libvpx-vp9','-crf','28','-b:v','0','-auto-alt-ref','0','-row-mt','1',str(assets/'kr8tiv-chrome-transparent.webm')],check=True)
