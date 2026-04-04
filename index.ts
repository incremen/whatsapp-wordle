import { SessionManager } from './SessionManager';

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const manager = new SessionManager();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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

client.on('message_create', async (msg: any) => {
    console.log('message_create:', msg.body, 'fromMe:', msg.fromMe);
    if (msg.body === 'a') {
        msg.reply('hello world');
    }
});

client.initialize();
