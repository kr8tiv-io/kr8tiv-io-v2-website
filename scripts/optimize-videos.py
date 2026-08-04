"""
optimize-videos.py — one-shot re-encode of public/kr8tiv-assets videos.

Every <video> on the site is muted (site music is a separate MP3), so audio
tracks are stripped. Files are re-encoded in place (same filenames — markup
cache-busts with ?v=2) and a poster JPEG is written for each video to
public/kr8tiv-assets/posters/<basename>.jpg so cards never render blank.

Display-size buckets:
  full  — full-viewport background loops: keep native resolution
  card  — portfolio/work cards (~600 px rendered): cap width at 1280
  tile  — small service tiles: cap width at 960
A re-encode only replaces the original when it is actually smaller.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public" / "kr8tiv-assets"
POSTERS = ROOT / "posters"
POSTERS.mkdir(exist_ok=True)

FULL = ["3-4.mp4", "forrestbackground.mp4", "contactheader-1.mp4",
        "oblisk-kr8tiv.mp4", "Processlandingmp4.mp4", "Untitled-design-56.mp4",
        "manifesto-bg.mp4"]
CARD = ["portfolio/kr8tiv - evolve eco blasting.mp4",
        "portfolio/kr8tiv 1 - aurora ventures.mp4",
        "portfolio/kr8tiv 2 - jarvis life.mp4",
        "portfolio/kr8tiv 3 - Meet Your Kin.mp4",
        "portfolio/kr8tiv 4 - kr8tiv ai.mp4",
        "portfolio/kr8tiv 5 - body by xenia.mp4",
        "portfolio/kr8tiv 6 - Pinky and the brain meme website.mp4",
        "portfolio/kr8tiv 7 - shane dooley roofing guru compressed.mp4",
        "Untitled-design-58.mp4"]
TILE = ["12_2.mp4", "12_3.mp4", "2-4.mp4", "Design-29-2-1.mp4", "2-1.mp4",
        "6-1.mp4", "1-1.mp4", "3-2.mp4", "7-1.mp4", "8-1.mp4", "9-1.mp4",
        "web-av-print-main-image-1.mp4", "Design-34.mp4"]

CAPS = {"full": None, "card": 1280, "tile": 960}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("FFMPEG ERROR:", " ".join(cmd), "\n", r.stderr[-1200:])
    return r.returncode == 0


def probe_width(path):
    r = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json",
                        "-show_streams", str(path)], capture_output=True, text=True)
    for s in json.loads(r.stdout)["streams"]:
        if s["codec_type"] == "video":
            return int(s["width"])
    return 0


results = []
for bucket, names in (("full", FULL), ("card", CARD), ("tile", TILE)):
    cap = CAPS[bucket]
    for name in names:
        src = ROOT / name
        if not src.exists():
            print("MISSING:", name)
            continue
        orig = src.stat().st_size

        vf = ["-vf", f"scale='min({cap},iw)':-2"] if cap and probe_width(src) > cap else []
        tmp = src.with_suffix(".opt.mp4")
        ok = run(["ffmpeg", "-y", "-i", str(src), *vf,
                  "-c:v", "libx264", "-crf", "27", "-preset", "slow",
                  "-profile:v", "high", "-pix_fmt", "yuv420p",
                  "-movflags", "+faststart", "-an", str(tmp)])
        if ok and tmp.stat().st_size < orig:
            shutil.move(tmp, src)
            action = "replaced"
        else:
            tmp.unlink(missing_ok=True)
            action = "kept original"
        new = src.stat().st_size

        poster = POSTERS / (src.stem + ".jpg")
        run(["ffmpeg", "-y", "-ss", "0.5", "-i", str(src),
             "-frames:v", "1", "-q:v", "3", str(poster)])

        results.append((name, orig, new, action))
        print(f"{name}: {orig/1e6:.2f} MB -> {new/1e6:.2f} MB ({action})")

tot_o = sum(r[1] for r in results)
tot_n = sum(r[2] for r in results)
print(f"\nTOTAL: {tot_o/1e6:.1f} MB -> {tot_n/1e6:.1f} MB "
      f"({100 - tot_n / tot_o * 100:.0f}% smaller)")
sys.exit(0)
