import * as fs from 'fs';
import * as path from 'path';

const FILE = path.join(__dirname, '..', '..', 'data', 'snapshot-chats.txt');

export function getSnapshotChats(): Set<string> {
    try { return new Set(fs.readFileSync(FILE, 'utf-8').split('\n').filter(Boolean)); }
    catch { return new Set(); }
}

export function setSnapshotChat(chatId: string, enabled: boolean) {
    const ids = getSnapshotChats();
    enabled ? ids.add(chatId) : ids.delete(chatId);
    fs.writeFileSync(FILE, [...ids].join('\n'));
}
