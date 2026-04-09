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

### Groupchat Admin commands
- `!disable` / `!enable` — toggle bot in this chat
- `!quiet enable/disable` — quiet mode: edits the board in place instead of sending new messages, reacts to guesses instead of replying
- `!dailyboard enable/disable` — daily recap at midnight
- `!startupmessage enable/disable` — notify this chat when bot starts

### Dev commands (bot owner only)
- `!snapshot` — send the database file as a backup
- `!dailysnapshot enable/disable` — auto-send DB backup at midnight
- `!recent` — show recent games

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

## Architecture & Customization

If you want to repurpose this infrastructure for a different bot, the core logic is decoupled from the Wordle game mechanics. To modify the bot's behavior, focus on `src/commands.ts` and `src/game/`.

The underlying infrastructure includes:

- **`index.ts`** — Message routing, developer/admin permission checks, and the chat toggle state.
- **`infra/normalizeId.ts`** — Resolves WhatsApp's `@lid` vs `@c.us` privacy ID mismatches. It extracts the raw phone number for database tracking while preserving the native `msg` object routing for group chats.
- **`lists/`** — Simple text-file persistence for chat states (disabled chats, toggled features).
- **`schedules/`** — Node-cron scheduling for daily boards and automated backups.
- **`clientConfig.ts`** — whatsapp-web.js client initialization and browser launch arguments.
