import * as fs from 'fs';
import * as path from 'path';

const dailyWords = new Map<string, string>();

const filePath = path.join(__dirname, '..', 'data', 'daily-words.txt');
for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const [date, word] = line.trim().split(' ');
    if (date && word) dailyWords.set(date, word);
}

export function getDailyWord(): string | null {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    return dailyWords.get(today) ?? null;
}
