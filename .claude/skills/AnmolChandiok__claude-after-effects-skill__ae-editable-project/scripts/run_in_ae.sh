#!/bin/bash
# Runs a .jsx inside After Effects (macOS) and waits for the project file + build log.
#   run_in_ae.sh build.jsx /abs/path/project.aep [timeout_seconds]
# Needs: After Effects installed; Settings > Scripting & Expressions >
# "Allow Scripts to Write Files and Access Network" turned on.
set -e
JSX="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; AEP="$2"; TIMEOUT="${3:-900}"
LOGF="${AEP%.aep}.build-log.txt"
APP=$(ls -d /Applications/Adobe\ After\ Effects\ 20*/Adobe\ After\ Effects\ 20*.app 2>/dev/null | sort | tail -1)
[ -z "$APP" ] && { echo "After Effects not found in /Applications"; exit 2; }
NAME=$(basename "$APP" .app)
rm -f "$LOGF"
find "$(dirname "$AEP")" -name 'ae_t*.png' -delete 2>/dev/null
osascript -e "tell application \"$NAME\" to DoScriptFile \"$JSX\"" >/dev/null 2>&1 &
for ((i=0; i<TIMEOUT; i+=2)); do [ -f "$LOGF" ] && break; sleep 2; done
[ -f "$LOGF" ] || { echo "timed out after ${TIMEOUT}s (is the scripting file-write preference on? is a dialog open in AE?)"; exit 3; }
# stills render asynchronously after the build: wait until they are all written
N=$(grep -m1 '^stills:' "$LOGF" | awk '{print $2}'); N=${N:-0}
DIR=$(dirname "$AEP")
if [ "$N" -gt 0 ]; then
  for ((j=0; j<TIMEOUT; j+=3)); do
    FILES=$(find "$DIR" -name 'ae_t*.png' | wc -l | tr -d ' ')
    A=$(find "$DIR" -name 'ae_t*.png' -exec stat -f %z {} + 2>/dev/null | paste -sd+ - | bc); sleep 3
    B=$(find "$DIR" -name 'ae_t*.png' -exec stat -f %z {} + 2>/dev/null | paste -sd+ - | bc)
    [ "$FILES" -ge "$N" ] && [ "$A" = "$B" ] && break
  done
  echo "stills written: $(find "$DIR" -name 'ae_t*.png' | wc -l | tr -d ' ') of $N"
fi
cat "$LOGF"
ls -la "$AEP"
