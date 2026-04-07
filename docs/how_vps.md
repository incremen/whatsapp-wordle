## Deployment & Maintenance

### 1. Initial Setup (Run Once)
```bash
npm run build

# Remove old instance if it exists (prevents "Script already launched" errors)
pm2 delete wordle-bot || true

# Launch the bot
pm2 start dist/index.js --name "wordle-bot"
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
* **Check what pm2 is running** `pm2 list`
* **Check console.log history from node** `pm2 logs wordle-bot`
* **Check last 200 lines** pm2 logs wordle-bot --lines 200
* **Check RAM/CPU:** `htop` or `free -h`
* **Check Bot specifically:** `pm2 monit`
* **Clear logs:** `pm2 flush`
* **Print with unicode stuff (show hebrew correctly)** `pm2 logs wordle-bot --raw | fribidi`
you might need to install fribidi first tho idk

**How to stop/kill:**
* **Stop (pause):** `pm2 stop wordle-bot`
* **Delete (remove from list):** `pm2 delete wordle-bot`
* **Kill PM2 (stops everything/nuclear):** `pm2 kill`