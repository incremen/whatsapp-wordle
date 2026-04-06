import { SessionManager } from './SessionManager';
import { log } from './logger';
import { getDisabledIds, setDisabled } from './disabledChats';
import { puppeteerConfig, client } from './clientConfig';

const qrcode = require('qrcode-terminal');

const manager = new SessionManager();


client.on('qr', (qr: string) => {
    qrcode.generate(qr, { small: true });
    log('QR ready');
});

client.on('ready', () => {
    const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
    const mem = process.memoryUsage();
    log('Client connected', `RSS: ${mb(mem.rss)} | Heap: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)}`);
});

client.on('message_create', async (msg: any) => {
    log('New message', `from: ${msg.from} body: ${msg.body}`);

    const chatId = msg.id.remote;
    if (msg.body === '!disable' && msg.fromMe) { setDisabled(chatId, true);  msg.reply('Bot disabled here.'); return; }
    if (msg.body === '!enable'  && msg.fromMe) { setDisabled(chatId, false); msg.reply('Bot enabled here.');  return; }
    if (getDisabledIds().has(chatId) && !msg.fromMe) return;

    let response = "";
    if (msg.body === '!wordle') {
        manager.create(msg.from);
        msg.reply('Game started! Use `!guess <word>` to play, `!hint` for a hint.');

    } else if (msg.body.startsWith('!guess ')) {
        const session = manager.get(msg.from);
        if (!session || session.done) response = 'No active game. Send `!wordle` to start one.';
        else response = session.guess(msg.body.slice(7));
        msg.reply(response);

    } else if (msg.body.startsWith('!hint')) {
        const session = manager.get(msg.from);
        if (!session || session.done) response = 'No active game. Send `!wordle` to start one.';
        else response = session.hint();
        msg.reply(response);
    }
});

client.initialize();
