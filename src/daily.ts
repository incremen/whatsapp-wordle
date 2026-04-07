import * as fs from 'fs';
import * as path from 'path';

const dailyWords = new Map<string, string>();

const filePath = path.join(__dirname, '..', 'data', 'daily-words.txt');
for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const [date, word] = line.trim().split(' ');
    if (date && word) dailyWords.set(date, word);
}

export function getTodayDate(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

export function getDailyWord(): string | null {
    return dailyWords.get(getTodayDate()) ?? null;
}
