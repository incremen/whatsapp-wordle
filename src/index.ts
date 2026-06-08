import { execSync } from 'child_process';
import { log } from './infra/logger';
import { getDisabledIds } from './lists/disabled';
import { client } from './clientConfig';
import { initDb } from './infra/db';
import { commands, adminCommands, devCommands, CommandMap } from './commands';
import { wordleCommands } from './wordle/commands';
import { startDailyBoardScheduler } from './schedules/dailyRecap';
import { startSnapshotScheduler } from './schedules/snapshot';
import { getStartupChats } from './lists/startup';
import { normalizeUserId } from './infra/normalizeId';
import { fmCommands } from './fm/commands';
import { latexCommands } from './latex/commands';
import { memeCommands } from './meme/commands';
import { translateCommands } from './translate/commands';

const LOCAL_ONLY = process.env.LOCAL_ONLY === 'true';

// Kill any orphaned Chromium processes left from a previous crash
try {
    execSync('pkill -9 -f chromium');
    log('Zombie sweep', 'killed orphaned Chromium processes');
} catch {
    // No zombies found — this is the happy path
}

const qrcode = require('qrcode-terminal');
const startupTime = Math.floor(Date.now() / 1000);

initDb();

async function gracefulShutdown(reason: string) {
    log('Shutdown', reason);
    try {
        await Promise.race([
            client.destroy(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
        ]);
        log('Shutdown', 'browser closed cleanly');
    } catch {
        log('Shutdown', 'browser freeze detected, bypassing');
    }
    process.exit(1);
}

process.on('unhandledRejection', (err) => gracefulShutdown(`Unhandled Rejection: ${err}`));
process.on('uncaughtException', (err) => gracefulShutdown(`Uncaught Exception: ${err.message}`));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

client.on('qr', (qr: string) => {
    qrcode.generate(qr, { small: true });
    log('QR ready');
});

let ready = false;

client.on('ready', async () => {
    log('Client connected');
    ready = true;
    startDailyBoardScheduler(client);
    startSnapshotScheduler(client);
    for (const chatId of getStartupChats()) {
        try { await client.sendMessage(chatId, 'Bot is online 🟢'); }
        catch (e) { log('Startup message failed', `${chatId}: ${e}`); }
    }

    // Watchdog: ping browser every 5 minutes to detect frozen Chromium
    setInterval(async () => {
        try {
            const state: string = await Promise.race([
                client.getState(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('FROZEN')), 10000)),
            ]) as string;

            if (state === 'CONFLICT' || state === 'UNPAIRED') {
                throw new Error(`Fatal WhatsApp state: ${state}`);
            }
        } catch (err: any) {
            gracefulShutdown(`Watchdog: ${err.message}`);
        }
    }, 5 * 60 * 1000);
});

client.on('message_create', async (msg: any) => {
    if (!ready) return;

    log('New message', `from: ${msg.from} body: ${msg.body}`);

    if (msg.timestamp < startupTime) return;

    const chatId = msg.id.remote;
    msg.senderId = await normalizeUserId(msg);

    if (!msg.body?.startsWith('!')) return;

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

    if (getDisabledIds().has(chatId)) return;

    const latexMatch = findCommand(msg.body, latexCommands);
    if (latexMatch) { latexMatch.handler(msg, chatId, latexMatch.args); return; }

    const memeMatch = findCommand(msg.body, memeCommands);
    if (memeMatch) { memeMatch.handler(msg, chatId, memeMatch.args); return; }

    const translateMatch = findCommand(msg.body, translateCommands);
    if (translateMatch) { translateMatch.handler(msg, chatId, translateMatch.args); return; }

    if (msg.body.startsWith('!fm ')) {
        const rest = msg.body.slice(4).trim();
        const [sub, ...argParts] = rest.split(' ');
        const handler = fmCommands[sub?.toLowerCase()];
        if (handler) handler(msg, chatId, argParts.join(' '));
        return;
    }

    const wordleMatch = findCommand(msg.body, wordleCommands);
    if (wordleMatch) { wordleMatch.handler(msg, chatId, wordleMatch.args); return; }

    const match = findCommand(msg.body, commands);
    if (match) match.handler(msg, chatId, match.args);
});

async function isGroupAdmin(msg: any, chatId: string): Promise<boolean> {
    if (!chatId.endsWith('@g.us')) return false;
    const senderId = msg.author;
    if (!senderId) return false;

    const chat = await msg.getChat();

    // Strip device session suffix (e.g. "123456:2@c.us" -> "123456@c.us")
    const [userPart, server] = senderId.split('@');
    const cleanId = `${userPart.split(':')[0]}@${server}`;

    let participant = chat.participants?.find((p: any) => p.id._serialized === cleanId);

    // Fallback: resolve @lid -> phone number via contact
    if (!participant) {
        try {
            const contact = await msg.getContact();
            if (contact?.number) {
                participant = chat.participants?.find((p: any) => p.id.user === contact.number);
            }
        } catch {}
    }

    return participant?.isAdmin || participant?.isSuperAdmin || false;
}

function findCommand(body: string, map: CommandMap): { handler: CommandMap[string]; args: string } | null {
    const prefix = body.split(' ')[0];
    const handler = map[prefix];
    if (!handler) return null;
    return { handler, args: body.slice(prefix.length + 1) };
}

client.initialize();
