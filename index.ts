import { SessionManager } from './SessionManager';
import * as fs from 'fs';
import * as path from 'path';

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const manager = new SessionManager();

const DISABLED_IDS_FILE = path.join(__dirname, 'disabled.txt');

function getDisabledIds(): Set<string> {
    try { return new Set(fs.readFileSync(DISABLED_IDS_FILE, 'utf-8').split('\n').filter(Boolean)); }
    catch { return new Set(); }
}
function setDisabled(chatId: string, disabled: boolean) {
    const ids = getDisabledIds();
    disabled ? ids.add(chatId) : ids.delete(chatId);
    fs.writeFileSync(DISABLED_IDS_FILE, [...ids].join('\n'));
}

const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
];

const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||                // explicit override always wins
    (process.platform === 'linux' ? '/snap/bin/chromium' : undefined); // linux default

const puppeteerConfig: any = executablePath
    ? { executablePath, args: PUPPETEER_ARGS }  // VPS
    : { browserURL: 'http://localhost:9222' };   // local: run ./chrome.sh first

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerConfig,
    webVersion: '2.3000.1014054010',
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014054010.html'
    }
});

const now = () => new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

client.on('qr', (qr: string) => {
    qrcode.generate(qr, { small: true });
    console.log(`[${now()}] Scan the QR code above with WhatsApp`);
});

client.on('ready', () => {
    const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
    const mem = process.memoryUsage();
    console.log(`[${now()}] Client is ready! | RSS: ${mb(mem.rss)} | Heap: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)}`);
});


client.on('message_create', async (msg: any) => {
    if (msg.body === '!disable' && msg.fromMe) 
        { setDisabled(msg.from, true);  msg.reply('Bot disabled here.'); return; 

        }
    if (msg.body === '!enable'  && msg.fromMe) {
         setDisabled(msg.from, false); msg.reply('Bot enabled here.');  return; 
        }
    if (getDisabledIds().has(msg.from) && !msg.fromMe)
         return;

    let response = "";
    if (msg.body === '!wordle') {
        manager.create(msg.from);
        msg.reply('Game started! Use `!guess <word>` to play, `!hint` for a hint.');

    } 
    else if (msg.body.startsWith('!guess ')) {
        const session = manager.get(msg.from);
        if (!session || session.done) {
            response = 'No active game. Send `!wordle` to start one.';
        }
    
        else {
            response = session.guess(msg.body.slice(7));
        }
        msg.reply(response);
    }

    else if (msg.body.startsWith('!hint')) {
        const session = manager.get(msg.from);
        if (!session || session.done) {
            response = 'No active game. Send `!wordle` to start one.';
        }
    
        else {
            response = session.hint();
        }
        msg.reply(response);

    }
});

client.initialize();
