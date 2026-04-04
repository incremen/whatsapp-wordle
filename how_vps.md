## Deployment & Maintenance

### 1. Initial Setup (Run Once)
```bash
# Build and copy assets
npx tsc
cp *.txt dist/

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

### 3. The "Update" Loop
*Run this every time you pull new code from GitHub.*
```bash
git pull
npx tsc
cp *.txt dist/
pm2 restart wordle-bot
```

---

### 4. Monitoring & Troubleshooting
* **Scan QR Code:** `pm2 logs wordle-bot`
* **Check RAM/CPU:** `htop` or `free -h`
* **Check Bot specifically:** `pm2 monit`
* **Clear old error logs:** `pm2 flush`
* **Check Swap status:** `swapon --show`