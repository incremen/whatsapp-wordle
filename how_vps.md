## Deployment Cheat Sheet

### Initial Setup
1. **Build the project:**
   ```bash
   npx tsc
   cp *.txt dist/
   ```
2. **Launch in background:**
   ```bash
   pm2 start dist/index.js --name "wordle-bot"
   ```
3. **Scan the QR code:**
   ```bash
   pm2 logs wordle-bot
   ```
   *(Press **Ctrl + C** to exit the log view; the bot stays running.)*
4. **Ensure it survives reboots:**
   ```bash
   pm2 save
   ```

---

### The Update Loop
Every time you pull new code from GitHub, run these in the project folder:
1. `git pull`
2. `npx tsc`
3. `cp *.txt dist/`
4. `pm2 restart wordle-bot`

---

### Troubleshooting
* **Check status:** `pm2 list`
* **See crash details:** `pm2 logs wordle-bot --err`
* **Clear old log text:** `pm2 flush`
* **Stop the bot:** `pm2 stop wordle-bot`