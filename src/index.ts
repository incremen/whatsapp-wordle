import { log } from './logger';
import { getDisabledIds } from './disabledChats';
import { client } from './clientConfig';
import { initDb } from './db';
import { commands, adminCommands, CommandMap } from './commands';
import { startDailyBoardScheduler } from './dailyBoardScheduler';

const qrcode = require('qrcode-terminal');

initDb();

client.on('qr', (qr: string) => {
    qrcode.generate(qr, { small: true });
    log('QR ready');
});

client.on('ready', () => {
    const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1) + ' MB';
    const mem = process.memoryUsage();
    log('Client connected', `RSS: ${mb(mem.rss)} | Heap: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)}`);
    startDailyBoardScheduler(client);
});

client.on('message_create', async (msg: any) => {
    log('New message', `from: ${msg.from} body: ${msg.body}`);

    const chatId = msg.id.remote;

    if (msg.fromMe) {
        const match = findCommand(msg.body, adminCommands);
        if (match) { match.handler(msg, chatId, match.args); return; }
    }

    if (getDisabledIds().has(chatId) && !msg.fromMe) return;

    const match = findCommand(msg.body, commands);
    if (match) match.handler(msg, chatId, match.args);
});

function findCommand(body: string, map: CommandMap): { handler: CommandMap[string]; args: string } | null {
    const prefix = body.split(' ')[0];
    const handler = map[prefix];
    if (!handler) return null;
    return { handler, args: body.slice(prefix.length + 1) };
}

client.initialize();    `x  `
