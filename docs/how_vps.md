This is just so i remember how to run it the server - this file probably shouldn't be on github but this way it's easy for me to find it :p

### 0. Setup & Clone Repository
```bash
# Install PM2 globally
sudo npm install -g pm2

# Clone the repository
git clone https://github.com/incremen/whatsapp-wordle.git
cd whatsapp-wordle
npm install
```

### 1. Initial Setup (Run Once)
```bash
npm install
npm run build

# Remove old instance if it exists (prevents "Script already launched" errors)
pm2 delete wordle-bot || true

# Launch the bot using ecosystem.config.js (sets kill_timeout for graceful shutdown)
pm2 start ecosystem.config.js
pm2 save
```

### 1.5. Environment Variables
API keys are NOT committed to the repo. Set them in `~/.bashrc` on the VPS so PM2 inherits them:
```bash
echo 'export LASTFM_API_KEY=thisisanapikey123456' >> ~/.bashrc
source ~/.bashrc
```
PM2 picks these up on restart. For local dev, they're in `nodemon.json`.

---

### 2. Manual Start (After Server Reboots)
*Because we are using the Snap version of Chromium, the bot CANNOT be auto-started by the system (Snap will block it). If the server reboots, you must log in and start it manually.*
```bash
# DO NOT run `pm2 startup`. If you accidentally do, remove it with `pm2 unstartup`.

# To start the bot after a server reboot:
pm2 start ecosystem.config.js
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

---

### 7. Disable AWS Sunday Reboots
*at least my specific aws config had this*
```bash
# Permanently disable the custom AWS reboot timer
sudo systemctl disable --now weekly-reboot-check.timer

# (Optional) Read the script to see what it was doing
cat /usr/local/bin/reboot-if-needed.sh
```