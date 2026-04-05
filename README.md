# WhatsApp Wordle Bot

A WhatsApp bot that lets users play Wordle via your user. Code is in `/src`.

## Commands
- `!wordle` — start a new game
- `!guess <word>` — make a guess
- `!hint` — reveal one correct letter
- `!disable` / `!enable` — disable/enable bot in this chat (owner only)

## Run locally
```bash
npm install
npx ts-node src/index.ts
```

> `scripts/`, `docs/how_vps`, config files etc. are quirks for running on a small server — you can mostly ignore/change them if just running locally.
