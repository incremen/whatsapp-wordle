import { log } from './logger';
import { getDisabledIds } from './disabledChats';
import { client } from './clientConfig';
import { initDb } from './db';
import { commands, adminCommands, Command } from './commands';

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
});

client.on('message_create', async (msg: any) => {
    log('New message', `from: ${msg.from} body: ${msg.body}`);

    const chatId = msg.id.remote;

    if (msg.fromMe) {
        const admin = findCommand(msg.body, adminCommands);
        if (admin) { admin.cmd.handler(msg, chatId, admin.args); return; }
    }

    if (getDisabledIds().has(chatId) && !msg.fromMe) return;

    const match = findCommand(msg.body, commands);
    if (match) match.cmd.handler(msg, chatId, match.args);
});


function findCommand(body: string, list: Command[]): { cmd: Command; args: string } | null {
    for (const cmd of list) {
        if (body === cmd.prefix || body.startsWith(cmd.prefix + ' ')) {
            return { cmd, args: body.slice(cmd.prefix.length + 1) };
        }
    }
    return null;
}

client.initialize();
