#!/bin/sh
# Trim edge silence and speed the raw TTS up 1.25x (pitch preserved). Needs ffmpeg on PATH.
mkdir -p assets/vo/fast
for i in 1 2 3 4 5 6 7 8 9; do
  ffmpeg -y -loglevel error -i assets/vo/vo-0$i.wav \
    -af "silenceremove=start_periods=1:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse,atempo=1.25,volume=1.6" \
    assets/vo/fast/vo-0$i.wav
done
