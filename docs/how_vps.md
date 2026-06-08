This is just so i remember how to run it the server - this file probably shouldn't be on github but this way it's easy for me to find it :p

### 0. Setup & Clone Repository
```bash
# Install usefull stuff
sudo npm install -g pm2
sudo snap install chromium
sudo apt install fonts-noto fontconfig libfribidi-bin

# For !rap and !tts audio commands
sudo apt install ffmpeg

# espeak-ng: the apt version (1.50) has NO Hebrew voice. Build 1.52+ from source.
# (Build outside the repo so it doesn't get committed.)
sudo apt install cmake build-essential
cd ~
git clone https://github.com/espeak-ng/espeak-ng.git
cd espeak-ng
cmake -B build
cmake --build build
sudo cmake --install build
sudo ldconfig
hash -r
espeak-ng --voices | grep -i hebrew   # should print a "he ... Hebrew" line
cd ~ && rm -rf ~/espeak-ng            # source no longer needed once installed

# Clone the repository
git clone https://github.com/incremen/whatsapp-wordle.git
cd whatsapp-wordle
npm install
```

### 1. Initial Setup (Run Once)
```bash
# Install fonts for image rendering (Hebrew, emojis, meme font)
sudo apt install fonts-noto fontconfig
mkdir -p ~/.local/share/fonts
wget -O ~/.local/share/fonts/NotoColorEmoji.ttf https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf
# Copy Futura from your Mac: scp -i whatsapp-bot-dev.pem /System/Library/Fonts/Supplemental/Futura.ttc ubuntu@<vps-ip>:~/.local/share/fonts/
fc-cache -fv

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
Then restart with `pm2 restart wordle-bot --update-env` to apply. For local dev, env vars are in `nodemon.json`.

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
git checkout -- package-lock.json
git pull
npm install
npm run build
pm2 restart wordle-bot --update-env
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
* **Errors Only:** `cat ~/.pm2/logs/wordle-bot-error.log`
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



## Not using snap chromium anymore, actually?
Idk what the memory leak is from but it is annoying. According to gemini:
"The AWS VPS is Graviton (aarch64 / ARM64), so Puppeteer's default Chrome for Testing x86 binary instantly crashes.

Snap Chromium uses a containerized squashfs filesystem. Its strict memory sandboxing combined with WhatsApp Web's heavy WASM encryption causes the renderer to balloon past 3GB of RAM and OOM crash.

We need a native .deb ARM64 build so Chromium can manage memory natively on the OS without container overhead. Since the server's default Python is messed up (ModuleNotFoundError: No module named 'apt_pkg'), normal PPA commands fail, so we have to add it manually."

And we could install the latest version like this:

```bash
# 1. Download the XtraDeb PPA GPG key directly (bypasses the broken Python apt script)
curl -sL "[https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x82BB6851C64F6880](https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x82BB6851C64F6880)" | sudo gpg --dearmor --yes -o /usr/share/keyrings/xtradeb.gpg

# 2. Add the repository to APT sources manually
echo "deb [arch=arm64 signed-by=/usr/share/keyrings/xtradeb.gpg] [https://ppa.launchpadcontent.net/xtradeb/apps/ubuntu](https://ppa.launchpadcontent.net/xtradeb/apps/ubuntu) jammy main" | sudo tee /etc/apt/sources.list.d/xtradeb.list

# 3. Install the native ARM64 Chromium package
sudo apt update
sudo apt install -y chromium

# Verify it points to /usr/bin/chromium and not /snap/bin/chromium
which chromium
```
