import { SessionManager} from './SessionManager';



const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const manager = new SessionManager();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        browserURL: 'http://localhost:9222', // local dev: run ./chrome.sh first. comment out for VPS
        // args: ['--no-sandbox', '--disable-setuid-sandbox'], // VPS: uncomment this, comment out browserURL
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
    console.log('Client is ready!');
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
    const parsed = parseMessage(msg);
    console.log(`new message `)
    if (!parsed) return;
    const { userId, body } = parsed;

    if (body === '!wordle') {
        manager.create(userId);
        msg.reply('Game started! Use !guess <word> to play.');
        
    } else if (body.startsWith('!guess ')) {
        const session = manager.get(userId);
        if (!session || session.done) {
            msg.reply('No active game. Send !wordle to start one.');
            return;
        }
        const response = session.guess(body.slice(7));
        msg.reply('```' + response + '```');
    }
});

client.initialize();
