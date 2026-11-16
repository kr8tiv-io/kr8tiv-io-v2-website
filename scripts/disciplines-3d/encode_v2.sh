#!/bin/bash
# encode.sh <name> <slug-out-dir>
n=$1; out=${2:-/workspace/kr8tiv-io-v2-website/public/kr8tiv-assets/disciplines/v2}; mkdir -p $out
src=${FR:-/workspace/kr8tiv-3d/v2/frames}/$n/%04d.png
# radial guard: everything past 92% radius forced to pure #000, near-black noise crushed
VF="format=rgb24,geq=r='r(X,Y)*clip((0.97-hypot(X-W/2,Y-H/2)/(W/2))/0.10,0,1)':g='g(X,Y)*clip((0.97-hypot(X-W/2,Y-H/2)/(W/2))/0.10,0,1)':b='b(X,Y)*clip((0.97-hypot(X-W/2,Y-H/2)/(W/2))/0.10,0,1)',lutrgb=r='if(lt(val,3),0,val)':g='if(lt(val,3),0,val)':b='if(lt(val,3),0,val)'"
ffmpeg -y -loglevel error -framerate 24 -i $src -vf "$VF" -c:v ffv1 /tmp/enc2_$n.mkv
LIM=${LIM:-540000}
c=${CRF:-24}
while :; do
ffmpeg -y -loglevel error -i /tmp/enc2_$n.mkv -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset veryslow -crf $c -tune animation -g 96 -movflags +faststart -an \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv $out/$n.mp4
[ $(stat -c%s $out/$n.mp4) -le $LIM ] || [ $c -ge 34 ] && break; c=$((c+2)); done
v=${VCRF:-35}
while :; do
ffmpeg -y -loglevel error -i /tmp/enc2_$n.mkv -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libvpx-vp9 -crf $v -b:v 0 -row-mt 1 -deadline good -cpu-used 1 -g 96 -an $out/$n.webm
[ $(stat -c%s $out/$n.webm) -le $LIM ] || [ $v -ge 50 ] && break; v=$((v+3)); done
echo "crf mp4=$c webm=$v"
ffmpeg -y -loglevel error -i /tmp/enc2_$n.mkv -frames:v 1 -q:v 3 $out/$n.jpg
ls -la $out/$n.* | awk '{print $5, $9}'
# phone encode: 400px, lighter
ffmpeg -y -loglevel error -i /tmp/enc2_$n.mkv -vf "scale=400:400:flags=lanczos,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset veryslow -crf $((c+1)) -tune animation -g 96 -movflags +faststart -an \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv $out/$n-m.mp4
ffmpeg -y -loglevel error -i /tmp/enc2_$n.mkv -vf "scale=400:400:flags=lanczos,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libvpx-vp9 -crf $((v+2)) -b:v 0 -row-mt 1 -deadline good -cpu-used 1 -g 96 -an $out/$n-m.webm
ls -la $out/$n-m.* | awk '{print $5, $9}'
