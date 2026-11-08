from pathlib import Path
from PIL import Image
import json
root=Path('/workspace/kr8tiv-io/shots/final');results=[]
for f in sorted(root.glob('logo-mark-*.png')):
 image=Image.open(f).convert('RGB');pixels=list(image.get_flattened_data());black=sum(max(p)<4 for p in pixels)/len(pixels);bright=sum(min(p)>110 for p in pixels)/len(pixels)
 results.append({'file':f.name,'near_black_fraction':black,'bright_chrome_fraction':bright})
 assert black<.03,(f.name,'rectangular black video matte remains',black)
 assert bright>.01,(f.name,'no visible chrome wordmark',bright)
assert len(results)==6
(root/'logo-pixel-results.json').write_text(json.dumps(results,indent=2));print('PASS six visible chrome logos with no near-black rectangular matte')
