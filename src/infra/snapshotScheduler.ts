import cron from 'node-cron';
import * as path from 'path';
import { getSnapshotChats } from './snapshotChats';
import { log } from './logger';

const { MessageMedia } = require('whatsapp-web.js');

export function buildSnapshotMedia() {
    const dbPath = path.join(__dirname, '..', '..', 'data', 'wordle.db');
    const media = MessageMedia.fromFilePath(dbPath);
    const date = new Date().toISOString().slice(0, 10);
    media.filename = `wordle-backup-${date}.db`;
    return media;
}

let scheduled = false;

export function startSnapshotScheduler(client: any) {
    if (scheduled) { log('Snapshot scheduler already running, skipping'); return; }
    scheduled = true;

    cron.schedule('6 23 * * *', async () => {
        log('Snapshot cron fired');
        const media = buildSnapshotMedia();
        for (const chatId of getSnapshotChats()) {
            try { await client.sendMessage(chatId, media, { sendMediaAsDocument: true }); }
            catch (e) { log('Snapshot send failed', `${chatId}: ${e}`); }
        }
    }, { timezone: 'Asia/Jerusalem' });

    log('Snapshot scheduler started (cron: 00:00 IST)');
}
