import { SessionManager} from './SessionManager';



const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const manager = new SessionManager();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // browserURL: 'http://localhost:9222', // local dev: run ./chrome.sh first. comment out for VPS
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',   // don't use /dev/shm (limited on VPS)
            '--disable-gpu',             // no GPU needed in headless
            '--single-process',          // run renderer in same process (big RAM saver)
            '--no-zygote',               // skip zygote process
        ], // VPS: uncomment this, comment out browserURL
    },
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

function parseMessage(msg: any): { userId: string, body: string } | null {
    if (msg.fromMe) {
        if (msg.body?.startsWith('!pretend ')) {
            return { userId: 'pretend_me', body: msg.body.slice('!pretend '.length) };
        }
        return null; // ignore own messages unless pretending
    }
    return { userId: msg.from, body: msg.body };
}

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
