import { log } from './infra/logger';
import { getDisabledIds } from './infra/disabledChats';
import { client } from './clientConfig';
import { initDb } from './infra/db';
import { commands, adminCommands, devCommands, CommandMap } from './commands';
import { startDailyBoardScheduler } from './game/dailyBoardScheduler';
import { startSnapshotScheduler } from './infra/snapshotScheduler';
import { getStartupChats } from './infra/startupChats';

const qrcode = require('qrcode-terminal');

initDb();

client.on('qr', (qr: string) => {
    qrcode.generate(qr, { small: true });
    log('QR ready');
});

client.on('ready', async () => {
    log('Client connected');
    startDailyBoardScheduler(client);
    startSnapshotScheduler(client);
    for (const chatId of getStartupChats()) {
        try { await client.sendMessage(chatId, 'Bot is online 🟢'); }
        catch (e) { log('Startup message failed', `${chatId}: ${e}`); }
    }
});

client.on('message_create', async (msg: any) => {
    log('New message', `from: ${msg.from} body: ${msg.body}`);

    const chatId = msg.id.remote;

    const devMatch = findCommand(msg.body, devCommands);
    if (devMatch) {
        if (msg.fromMe) devMatch.handler(msg, chatId, devMatch.args);
        return;
    }

    const adminMatch = findCommand(msg.body, adminCommands);
    if (adminMatch) {
        if (msg.fromMe || await isGroupAdmin(msg, chatId)) {
            adminMatch.handler(msg, chatId, adminMatch.args);
        }
        return;
    }

    if (getDisabledIds().has(chatId) && !msg.fromMe) return;

    const match = findCommand(msg.body, commands);
    if (match) match.handler(msg, chatId, match.args);
});

async function isGroupAdmin(msg: any, chatId: string): Promise<boolean> {
    if (!chatId.endsWith('@g.us')) return false;
    const chat = await msg.getChat();
    const ids = [msg.from, msg.author].filter(Boolean);
    const participant = chat.participants?.find((p: any) => ids.includes(p.id._serialized));
    return participant?.isAdmin || participant?.isSuperAdmin || false;
}

function findCommand(body: string, map: CommandMap): { handler: CommandMap[string]; args: string } | null {
    const prefix = body.split(' ')[0];
    const handler = map[prefix];
    if (!handler) return null;
    return { handler, args: body.slice(prefix.length + 1) };
}

client.initialize();    `x  `
