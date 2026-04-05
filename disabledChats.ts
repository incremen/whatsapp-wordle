import * as fs from 'fs';
import * as path from 'path';

const DISABLED_IDS_FILE = path.join(__dirname, 'disabled.txt');

export function getDisabledIds(): Set<string> {
    try { return new Set(fs.readFileSync(DISABLED_IDS_FILE, 'utf-8').split('\n').filter(Boolean)); }
    catch { return new Set(); }
}

export function setDisabled(chatId: string, disabled: boolean) {
    const ids = getDisabledIds();
    disabled ? ids.add(chatId) : ids.delete(chatId);
    fs.writeFileSync(DISABLED_IDS_FILE, [...ids].join('\n'));
}
