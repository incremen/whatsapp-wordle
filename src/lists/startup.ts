import * as fs from 'fs';
import * as path from 'path';

const FILE = path.join(__dirname, '..', '..', 'data', 'startup-chats.txt');

export function getStartupChats(): Set<string> {
    try { return new Set(fs.readFileSync(FILE, 'utf-8').split('\n').filter(Boolean)); }
    catch { return new Set(); }
}

export function setStartupChat(chatId: string, enabled: boolean) {
    const ids = getStartupChats();
    enabled ? ids.add(chatId) : ids.delete(chatId);
    fs.writeFileSync(FILE, [...ids].join('\n'));
}
