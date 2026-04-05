# WhatsApp Wordle Bot

A WhatsApp bot that lets users play Wordle via chat.

## Commands
- `!wordle` — start a new game
- `!guess <word>` — make a guess
- `!hint` — reveal one correct letter
- `!disable` — disable bot in this chat (owner only)
- `!enable` — re-enable bot in this chat (owner only)

---

## Project Structure

### Source (shared / needed by everyone)
| File | Purpose |
|------|---------|
| `index.ts` | Entry point, WhatsApp event handlers |
| `Session.ts` | Game logic |
| `SessionManager.ts` | Maps user/chat IDs to sessions |
| `clientConfig.ts` | Puppeteer/Chrome config (auto-detects local vs VPS) |
| `disabledChats.ts` | Persist which chats have the bot disabled |
| `logger.ts` | Timestamped logging with RAM/CPU stats |
| `data/` | Word lists (`valid-guesses.txt`, `valid-targets.txt`) |

### Just for me (local dev)
| File | Purpose |
|------|---------|
| `scripts/chrome.sh` | Launch headless Chrome locally (edit path for your Chrome) |
| `scripts/start.sh` | Start Chrome + nodemon together |
| `nodemon.json` | Auto-restart on save config |

### Docs
| File | Purpose |
|------|---------|
| `docs/how_vps.md` | VPS deployment steps |
| `docs/feature_ideas.md` | Planned features |

---

## Running Locally (Mac)
```bash
./scripts/start.sh
```
Edit the Chrome path in `scripts/start.sh` and `scripts/chrome.sh` to match your installation.

## Running on VPS (Ubuntu)
```bash
npm install
npx ts-node index.ts
```
Chromium is auto-detected at `/snap/bin/chromium`. Override with `PUPPETEER_EXECUTABLE_PATH` env var if needed.
