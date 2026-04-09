import * as fs from 'fs';
import * as path from 'path';

const FILE = path.join(__dirname, '..', '..', 'data', 'quiet-chats.txt');

export function getQuietChats(): Set<string> {
    try { return new Set(fs.readFileSync(FILE, 'utf-8').split('\n').filter(Boolean)); }
    catch { return new Set(); }
}

export function setQuiet(chatId: string, enabled: boolean) {
    const ids = getQuietChats();
    enabled ? ids.add(chatId) : ids.delete(chatId);
    fs.writeFileSync(FILE, [...ids].join('\n'));
}
