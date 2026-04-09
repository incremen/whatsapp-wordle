import * as fs from 'fs';
import * as path from 'path';

// Tracks chats that have opted OUT of quiet mode (loud chats).
// By default, all chats are quiet.
const FILE = path.join(__dirname, '..', '..', 'data', 'loud-chats.txt');

export function isQuiet(chatId: string): boolean {
    return !getLoudChats().has(chatId);
}

function getLoudChats(): Set<string> {
    try { return new Set(fs.readFileSync(FILE, 'utf-8').split('\n').filter(Boolean)); }
    catch { return new Set(); }
}

export function setQuiet(chatId: string, enabled: boolean) {
    const ids = getLoudChats();
    enabled ? ids.delete(chatId) : ids.add(chatId);
    fs.writeFileSync(FILE, [...ids].join('\n'));
}
