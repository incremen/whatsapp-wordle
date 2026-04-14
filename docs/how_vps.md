This is just so i remember how to run it the server - this file probably shouldn't be on github but this way it's easy for me to find it :p

## Deployment & Maintenance

### 1. Initial Setup (Run Once)
```bash
npm run build

# Remove old instance if it exists (prevents "Script already launched" errors)
pm2 delete wordle-bot || true

# Launch the bot (ecosystem.config.js sets kill_timeout for graceful shutdown)
pm2 start ecosystem.config.js
pm2 save
```

---

### 2. Server Health (2GB RAM Safety Net)
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

### 3. The Update Loop
*Run this every time you pull new code from GitHub. Note: 'restart' kills the old process for you.*
```bash
git pull
npm run build
pm2 restart wordle-bot
pm2 logs wordle-bot --raw | fribidi
```

---

### 4. Monitoring & Troubleshooting
* **Check status overview:** `pm2 list`
* **Check full log history:** `pm2 logs wordle-bot`
* **Live logs with timestamps:** `pm2 logs wordle-bot --time`
* **Live errors only (real-time filter):** `pm2 logs wordle-bot --err`
* **Check last 200 lines:** `pm2 logs wordle-bot --lines 200`
* **Read raw error file history:** `tail -n 100 ~/.pm2/logs/wordle-bot-error.log`
* **Search error history for keywords:** `grep "Puppeteer" ~/.pm2/logs/wordle-bot-error.log`
* **Check RAM/CPU:** `htop` (Press `Shift + P` to sort by CPU, `Shift + H` to hide threads) or `free -h`
* **Bot dashboard:** `pm2 monit`
* **Clear all logs:** `pm2 flush`
* **Show Hebrew correctly (Unicode):** `pm2 logs wordle-bot --raw | fribidi` (Requires `fribidi` installed)

**How to stop/kill:**
* **Stop (pause):** `pm2 stop wordle-bot`
* **Delete (remove from list):** `pm2 delete wordle-bot`
* **Kill PM2 (nuclear):** `pm2 kill`
* **Kill zombie browsers:** `sudo pkill -9 -f chromium` (Use this if `htop` shows CPU at 100% and the bot isn't responding)