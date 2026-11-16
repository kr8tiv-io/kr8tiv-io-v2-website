# contact_sheet.py <frame> <out.jpg> [framesdir]  -> labelled 4x3 sheet of the 11 v2 loops, site type + palette
import sys, glob
from PIL import Image, ImageDraw, ImageFont
f = sys.argv[1]; out = sys.argv[2]; fr = sys.argv[3] if len(sys.argv) > 3 else '/workspace/kr8tiv-3d/v2/frames'
ITEMS = [('laptop', '001', 'Website Design', 'Pearl laptop, the site pops out as glass cards'),
 ('signet', '002', 'Branding + Identity', 'Needle-spire seal stamps a glowing wax peak'),
 ('mobius', '003', 'Video Editing', 'Moebius reel of tiny mountain frames'),
 ('bag', '004', 'Ecommerce Setups', 'Velvet bag, ringed planet for sale'),
 ('chain', '005', 'UX/UI + Blockchain', 'Chained glass terrariums'),
 ('sign', '006', 'Signage + Print', 'Neon peak blade sign, moon lantern'),
 ('box', '007', 'Packaging + Mockups', 'Gift box opens on a ringed peak'),
 ('lens', '008', 'Studio + A/V Print', 'Coated cinema lens, focused on a moon'),
 ('target', '009', 'Ads + Acquisition', 'Exploded glass target, ripple on hit'),
 ('phone', '010', 'App Product Design', 'Pearl phone, orbiting app tiles'),
 ('gyro', '011', 'Motion + 3D', 'Iridescent gyroscope, ringed moon core')]
FD = '/usr/share/fonts/truetype/sand-box/google/'
def font(pat, size):
    g = glob.glob(FD + pat)
    return ImageFont.truetype(g[0], size) if g else ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', size)
serif = font('Instrument Serif/InstrumentSerif-Regular.ttf', 30); serif_i = font('Instrument Serif/InstrumentSerif-Italic.ttf', 30)
big = font('Instrument Serif/InstrumentSerif-Italic.ttf', 46); mono = font('JetBrains Mono/JetBrainsMono-VariableFont_wght.ttf', 13); inter = font('Inter/Inter-Var*.ttf', 15)
T, PAD, CAP = 400, 24, 74
W = PAD + 4*(T + PAD); H = 110 + 3*(T + CAP + PAD)
im = Image.new('RGB', (W, H), (5, 5, 7)); d = ImageDraw.Draw(im)
d.text((PAD, 26), 'Moonrise Curios', font=big, fill=(242, 241, 236))
d.text((PAD + 300, 44), 'KR8TIV  /  ELEVEN DISCIPLINES  /  3D LOOPS V2  /  4 S SEAMLESS  /  640 PX', font=mono, fill=(255, 106, 213))
for i, (slug, n, title, note) in enumerate(ITEMS):
    x = PAD + (i % 4)*(T + PAD); y = 110 + (i // 4)*(T + CAP + PAD)
    tile = Image.open(f'{fr}/{slug}/{f}.png').convert('RGB').resize((T, T), Image.LANCZOS)
    mask = Image.new('L', (T, T), 0); ImageDraw.Draw(mask).ellipse((0, 0, T - 1, T - 1), fill=255)
    bg = Image.new('RGB', (T, T), (16, 9, 26)); bg.paste(tile, (0, 0), mask); im.paste(bg, (x, y))
    d.text((x, y + T + 8), n, font=mono, fill=(255, 45, 74))
    words = title.split(' '); head = ' '.join(words[:-1]); last = words[-1]
    d.text((x + 40, y + T + 0), head + (' ' if head else ''), font=serif, fill=(242, 241, 236))
    wx = x + 40 + d.textlength(head + (' ' if head else ''), font=serif)
    d.text((wx, y + T + 0), last, font=serif_i, fill=(255, 106, 213))
    d.text((x, y + T + 40), note, font=inter, fill=(170, 166, 180))
x = PAD + 3*(T + PAD); y = 110 + 2*(T + CAP + PAD)
for k, line in enumerate(['One set, one world:', 'every object floats over the same', 'ridge-line moon island, ringed by a', 'gold halo of drifting moon beads,', 'with moon dust rising.', '', 'Pearl chrome, thin-film glass,', 'obsidian, gold. Magenta, purple,', 'cyan rim light. Same tilt and scale.']):
    d.text((x, y + 20 + k*26 + (16 if k else 0)), line, font=inter if k else serif_i, fill=(242, 241, 236) if k == 0 else (170, 166, 180))
im.save(out, quality=90); print(out, im.size)
