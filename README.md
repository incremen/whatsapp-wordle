# Botanar

A WhatsApp bot with multiple modules — Wordle, Last.fm, and LaTeX. Built with `whatsapp-web.js` and runs as your WhatsApp user. Works in DMs and group chats.

This is inspired by discord bots, who have a lot of functionality. The goal is to import all the cool stuff discord bots can do into whatsapp.
- `!help` — list all commands

## Wordle

Play Wordle in any chat. Supports shared games in group chats, hints, daily challenges, survival mode, and stats tracking.

#### Commands
- `!wordle` — start a new game
- `!guess <word>` — make a guess
- `!wordle <word1> <word2> ...` — start new game with pre-guesses
- `!daily` — daily challenge (DMs only). No hints
- `!survival` — endless mode: start with 10 guesses, solve a word in *n* guesses to earn 8−*n* more. No hints
- `!hint` — reveal one correct letter
- `!stats` — your stats
- `!dailystats` — daily recap (GCs only)
- `!botstats` — global bot stats

## Last.fm

Track your music listening stats. Requires a Last.fm account (https://www.last.fm/join) with scrobbling enabled.

#### Commands
- `!fm set <username>` — link your Last.fm account
- `!fm np` — now playing / last scrobbled track
- `!fm chart [size] [period]` — album art grid (e.g. `!fm chart 4x4 monthly`)
- `!fm toptracks [period]` — top 10 tracks
- `!fm topartists [period]` — top 10 artists
- `!fm profile` — scrobble count, country, join date
- `!fm unset` — unlink account

Periods: `week`, `monthly`, `quarter`, `half`, `yearly`, `alltime` (defaults to weekly)

## LaTeX

Render LaTeX math expressions as WhatsApp stickers.

#### Commands
- `!l <expression>` — render LaTeX as a sticker (e.g. `!l \frac{a}{b}`)

## Admin Commands (GC only)
- `!disable` / `!enable` — toggle bot in this chat (disables all modules)
- `!startupmessage enable/disable` — notify this chat when bot starts

#### Wordle-specific
- `!quiet enable/disable` — quiet mode: edits the board in place instead of sending new messages, reacts to guesses instead of replying
- `!dailyboard enable/disable` — daily recap at midnight

## Dev Commands (bot owner only)
- `!snapshot` — send the wordle database file as a backup
- `!dailysnapshot enable/disable` — auto-send wordle DB backup daily
- `!recent` — show recent wordle games

## Run locally

### Prerequisites
- Node.js (v18+)
- Google Chrome or Chromium installed

### Setup
1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Check `src/clientConfig.ts` — if Chrome/Chromium isn't in the default path, update `executablePath`.

3. Start the bot:
   ```bash
   npm run dev
   ```

4. Scan the QR code that appears in your terminal with WhatsApp (Linked Devices > Link a Device).

The bot runs as your WhatsApp user — messages you send with `!wordle`, `!fm`, `!l`, etc. will work in any chat.

> By default, `npm run dev` runs in `LOCAL_ONLY` mode (only LaTeX commands active). Remove `LOCAL_ONLY=true` from `nodemon.json` to enable all commands locally.

> `docs/how_vps.md` has instructions for running on a VPS with PM2.
<img width="629" height="645" alt="image" src="https://github.com/user-attachments/assets/0ddb84ba-69c4-4508-a340-08790925816b" />

