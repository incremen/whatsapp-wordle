import * as fs from 'fs';
import * as path from 'path';

// Allowlist of chats where the bot is active. Chats are DISABLED by default —
// the owner must `!enable` a chat for the bot to respond there.
const ENABLED_IDS_FILE = path.join(__dirname, '..', '..', 'data', 'enabled.txt');

export function getEnabledIds(): Set<string> {
    try { return new Set(fs.readFileSync(ENABLED_IDS_FILE, 'utf-8').split('\n').filter(Boolean)); }
    catch { return new Set(); }
}

export function setEnabled(chatId: string, enabled: boolean) {
    const ids = getEnabledIds();
    enabled ? ids.add(chatId) : ids.delete(chatId);
    fs.writeFileSync(ENABLED_IDS_FILE, [...ids].join('\n'));
}
