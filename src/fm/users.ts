import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(__dirname, '..', '..', 'data', 'fm-users.json');

type UserMap = Record<string, string>;

function load(): UserMap {
    if (!existsSync(FILE)) return {};
    return JSON.parse(readFileSync(FILE, 'utf-8'));
}

function save(map: UserMap) {
    writeFileSync(FILE, JSON.stringify(map, null, 2));
}

export function getUsername(whatsappId: string): string | undefined {
    return load()[whatsappId];
}

export function setUsername(whatsappId: string, lastfmUsername: string) {
    const map = load();
    map[whatsappId] = lastfmUsername;
    save(map);
}

export function removeUsername(whatsappId: string) {
    const map = load();
    delete map[whatsappId];
    save(map);
}
