import * as fs from 'fs';
import * as path from 'path';

const FILE = path.join(__dirname, '..', '..', 'data', 'dailyboard-chats.txt');

export function getDailyBoardChats(): Set<string> {
    try { return new Set(fs.readFileSync(FILE, 'utf-8').split('\n').filter(Boolean)); }
    catch { return new Set(); }
}

export function setDailyBoard(chatId: string, enabled: boolean) {
    const ids = getDailyBoardChats();
    enabled ? ids.add(chatId) : ids.delete(chatId);
    fs.writeFileSync(FILE, [...ids].join('\n'));
}
