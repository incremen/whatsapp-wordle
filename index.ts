import { SessionManager} from './SessionManager';



const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const manager = new SessionManager();

const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
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

client.on('qr', (qr: string) => {
    qrcode.generate(qr, { small: true });   
    console.log('Scan the QR code above with WhatsApp');
});

client.on('ready', () => {
    const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
    const mem = process.memoryUsage();
    console.log(`Client is ready! | RSS: ${mb(mem.rss)} | Heap: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)}`);
});


client.on('message_create', async (msg: any) => {
    console.log(`new message `)

    let response = "";
    if (msg.body === '!wordle') {
        manager.create(msg.from);
        msg.reply('Game started! Use `!guess <word>` to play.');

    } else if (msg.body.startsWith('!guess ')) {
        const session = manager.get(msg.from);
        if (!session || session.done) {
            response = 'No active game. Send `!wordle` to start one.';
        }
        else {
            response = session.guess(msg.body.slice(7));
        }
        msg.reply(response);
    }
});

client.initialize();
