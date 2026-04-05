#!/bin/bash
# Start Chrome in background, then run the bot (auto-restarts on save)

# Replace with your Chrome path, e.g: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
"/Applications/Google Chrome updated yay.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --remote-debugging-port=9222 \
  --no-sandbox \
  --user-data-dir=/tmp/wa-chrome 2>/dev/null &

sleep 1
exec npx nodemon --signal SIGKILL
