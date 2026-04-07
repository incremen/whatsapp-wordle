import * as fs from 'fs';
import * as path from 'path';

const dataDir = path.join(__dirname, '..', 'data');
const targets = fs.readFileSync(path.join(dataDir, 'valid-targets.txt'), 'utf-8')
    .split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 5);

// Fisher-Yates shuffle
for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
}

const start = new Date('2026-04-06');
const days = 365 * 10;
const lines: string[] = [];

for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);
    lines.push(`${dateStr} ${targets[d % targets.length]}`);
}

const outPath = path.join(dataDir, 'daily-words.txt');
fs.writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`Wrote ${lines.length} daily words to ${outPath}`);
