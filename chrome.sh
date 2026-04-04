#!/bin/bash
# Run this once in a separate terminal, then start the bot with: npx ts-node index.ts
#this way you dont have to reopen whatsapp or rerun server each time
"/Applications/Google Chrome updated yay.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --remote-debugging-port=9222 \
  --no-sandbox \
  --user-data-dir=/tmp/wa-chrome
