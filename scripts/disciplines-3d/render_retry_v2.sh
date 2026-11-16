#!/bin/bash
# Re-runs each object until all 96 frames exist (scene_v2.py skips frames already on disk).
# Blender 4.2's Embree BVH build crashes now and then mid-sequence; resuming is safe and exact.
B=/opt/blender/blender-4.2.3-linux-x64/blender
cd /workspace/kr8tiv-3d/v2
for n in ${@:-laptop mobius bag sign box lens target phone gyro chain signet}; do
  for try in 1 2 3 4 5 6 7 8 9 10; do
    c=$(ls frames/$n 2>/dev/null | wc -l); [ "$c" -ge 96 ] && break
    echo "RUN $n try$try have=$c $(date +%T)"
    S=32; [ "$n" = chain ] && S=48
    FIT=0 $B -b --python-exit-code 1 -P scene_v2.py -- $n frames/$n 96 $S 640 > logs/$n.r$try.log 2>&1 || echo "crash $n try$try"
  done
  echo "DONE $n $(ls frames/$n | wc -l) $(date +%T)"
done
echo ALLDONE
