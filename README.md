# WhatsApp Wordle Bot

A WhatsApp bot that lets you play Wordle in any chat — DMs or group chats. Built with `whatsapp-web.js` and runs as your WhatsApp user. Supports shared games in group chats, hints, stats tracking, and pre-guessing on game start. Code is in `/src`.

## Commands
- `!wordle` — start a new game
- `!guess <word>` — make a guess
- `!wordle <word1> <word2> ...` — start new game with pre-guesses
- `!daily` — daily challenge (DMs only)
- `!hint` — reveal one correct letter
- `!stats` — your stats
- `!dailystats` — daily recap (GCs only)
- `!help` — list commands

### Admin commands (group admin or bot owner)
- `!disable` / `!enable` — toggle bot in this chat
- `!dailyboard enable/disable` — daily recap at midnight
- `!startupmessage enable/disable` — notify this chat when bot starts

## Run locally

### Prerequisites
- Node.js (v18+)
- Google Chrome or Chromium installed (Puppeteer can install Chromium for you with `npx puppeteer browsers install chrome`, but you probably already have Chrome)

### Setup
1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Check `src/clientConfig.ts` — if Chrome/Chromium isn't in the default path, update `executablePath` to point to yours.

3. Start the bot:
   ```bash
   npx ts-node src/index.ts
   ```

4. Scan the QR code that appears in your terminal with WhatsApp (Linked Devices > Link a Device).

The bot runs as your WhatsApp user - messages you send with `!wordle`, `!guess`, etc. will work in any chat.

> `scripts/start.sh` can also be used locally — it launches Chrome with remote debugging and starts the bot. Just update the Chrome path in it and in `clientConfig.ts` set `browserURL: 'http://localhost:9222'` instead of `executablePath`.

> `scripts/`, `docs/how_vps`, config files etc. are for running on a (weak) VPS — you can ignore them when running locally.
