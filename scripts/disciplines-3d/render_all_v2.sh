#!/bin/bash
B=/opt/blender/blender-4.2.3-linux-x64/blender
cd /workspace/kr8tiv-3d/v2
for n in ${@:-laptop signet mobius bag chain sign box lens target phone gyro}; do
  echo "START $n $(date +%T)"
  $B -b --python-exit-code 1 -P scene_v2.py -- $n frames/$n 96 48 640 > logs/$n.log 2>&1 || echo "FAIL $n"
  echo "END $n $(date +%T) $(ls frames/$n | wc -l) $(grep FIT logs/$n.log)"
done
echo ALLDONE
