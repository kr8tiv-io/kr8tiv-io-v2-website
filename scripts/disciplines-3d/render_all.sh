#!/bin/bash
B=/opt/blender/blender-4.2.3-linux-x64/blender
cd /workspace/kr8tiv-3d
for n in ${@:-laptop signet mobius gyro target bag chain sign box lens phone}; do
  echo "START $n $(date +%T)"
  $B -b --python-exit-code 1 -P scene.py -- $n frames/$n 96 40 640 > logs/$n.log 2>&1 || echo "FAIL $n"
  echo "END $n $(date +%T) $(ls frames/$n | wc -l)"
done
echo ALLDONE
