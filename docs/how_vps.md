This is just so i remember how to run it the server - this file probably shouldn't be on github but this way it's easy for me to find it :p

### 1. Initial Setup (Run Once)
```bash
npm run build

# Remove old instance if it exists (prevents "Script already launched" errors)
pm2 delete wordle-bot || true

# Launch the bot using ecosystem.config.js (sets kill_timeout for graceful shutdown)
pm2 start ecosystem.config.js
pm2 save
```

---

### 2. Auto-Start (Survive Server Reboots)
*Run this so PM2 automatically launches your bot if AWS restarts your server.*
```bash
# 1. Generate the startup script
pm2 startup

# 2. IMPORTANT: PM2 will output a command at the bottom starting with "sudo env PATH...". 
#    You MUST copy that exact line, paste it into your terminal, and press Enter.

# 3. Freeze the current app list so it remembers what to boot
pm2 save
```

---

### 3. Server Health (2GB RAM Safety Net)
*Run these to prevent "Out of Memory" crashes if not already done.*
```bash
# Create 2GB swap file (if not already created)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent on reboot (if not already in fstab)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

### 4. The Update Loop
*Run this every time you pull new code from GitHub.*
```bash
git pull
npm run build
pm2 restart wordle-bot
pm2 logs wordle-bot --raw | fribidi
```

---

### 5. Self-Healing Architecture
The bot has built-in crash recovery to handle Chromium's occasional tantrums.

**Automated Recovery Steps:**
1. **On Boot:** Automatically kills any orphaned Chromium processes.
2. **Every 5 Minutes:** Pings the browser state (10s timeout).
3. **On Freeze:** Attempts a clean `client.destroy()` (15s timeout), then exits.
4. **Process Management:** PM2 detects the exit and restarts. The `ecosystem.config.js` sets `kill_timeout: 20000`, giving the bot 20s to shut down before a force-kill occurs.

**Manual Intervention (The Nuclear Option):**
If the bot is stuck and not self-healing:
```bash
sudo pkill -9 -f chromium
pm2 restart wordle-bot
```

---

### 6. Monitoring & Troubleshooting
* **Status Overview:** `pm2 list`
* **Live Logs:** `pm2 logs wordle-bot --time`
* **Errors Only:** `pm2 logs wordle-bot --err`
* **Check History:** `pm2 logs wordle-bot --lines 200`
* **Search for Crashes:** `grep "Puppeteer" ~/.pm2/logs/wordle-bot-error.log`
* **System Stats:** `htop` (Press `Shift + P` to sort by CPU, `Shift + H` to hide threads)
* **Wipe Logs:** `pm2 flush`
* **Hebrew Support:** `pm2 logs wordle-bot --raw | fribidi`

**Control Commands:**
* **Pause:** `pm2 stop wordle-bot`
* **Remove:** `pm2 delete wordle-bot`
* **Kill PM2:** `pm2 kill`

