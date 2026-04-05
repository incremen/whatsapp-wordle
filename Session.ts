import * as fs from 'fs';
import * as path from 'path';

function loadWords(file: string): string[] {
    return fs.readFileSync(path.join(__dirname, file), 'utf-8')
        .split('\n').map(w => w.trim()).filter(w => w.length === 5);
}

const VALID_GUESSES = new Set(loadWords('valid-guesses.txt'));
const VALID_TARGETS = loadWords('valid-targets.txt');
export const MAX_GUESSES = 6;


type BoardRow = {
    guess: string;
    emojis: string[];
}

export class Session {
    target: string;
    guesses: number = 0;
    board: BoardRow[] = [];
    done: boolean = false;
    won: boolean = false;
    found: string[] = Array(5).fill('_');
    misplaced = new Set<string>();
    eliminated = new Set<string>();

    constructor() {
        this.target = VALID_TARGETS[Math.floor(Math.random() * VALID_TARGETS.length)].toUpperCase();
    }

    guess(input: string): string {
        const word = input.trim().toUpperCase();

        if (word.length !== 5 || !/^[A-Z]+$/.test(word)) {
            return 'Enter a 5-letter word.';
        }
        if (!VALID_GUESSES.has(word.toLowerCase())) {
            return 'Not a valid word.';
        }

        const emojis = this._getGuessEmojis(word);
        this.board.push({ guess: word, emojis });
        this.guesses++;
        this._updateLetterState(word, emojis);

        if (word === this.target) {
            this.done = true;
            this.won = true;
        } else if (this.guesses >= MAX_GUESSES) {
            this.done = true;
        }

        return this.getBoardText();
    }


    getBoardText(): string {
        const history = '```' + this.board.map(r => `${r.guess}: ${r.emojis.join('')}`).join('\n') + '```';
        const dashboard = this.done ? '' : '\n\n' + this._getDashboard();
        if (this.won) return `${history}\n\nGot it in ${this.guesses}!`;
        if (this.done) return `${history}\n\nFool. The word was: '${this.target}'`;
        return history + dashboard;
    }

    private _updateLetterState(word: string, emojis: string[]): void {
        for (let i = 0; i < 5; i++) {
            const letter = word[i];
            if (emojis[i] === '🟩') {
                this.found[i] = letter;
            } else if (emojis[i] === '🟨') {
                this.misplaced.add(letter);
            } else {
                this.eliminated.add(letter);
            }
        }
        // a letter marked ⬛ in one position may still be 🟩/🟨 elsewhere (double letters)
        for (const letter of this.found) {
            if (letter !== '_') { this.eliminated.delete(letter); this.misplaced.delete(letter); }
        }
        for (const letter of this.misplaced) this.eliminated.delete(letter);
    }

    private _getDashboard(): string {

        const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const available = allLetters.filter(l =>
            !this.misplaced.has(l) && !this.eliminated.has(l) && !this.found.includes(l)
        );

        const lines = [
            `🟩 Found:      ${this.found.join(' ')}`,
            `🟨 Misplaced:  ${[...this.misplaced].join(', ') || '-'}`,
            `⬛ Eliminated: ${[...this.eliminated].join(', ') || '-'}`,
            `⬜ Available:  ${available.join(', ')}`,
        ];
        return '```' + lines.join('\n') + '```';
    }

    private _getGuessEmojis(guess: string): string[] {
        const result = ['⬛', '⬛', '⬛', '⬛', '⬛'];
        const targetArr = this.target.split('');
        const guessArr = guess.split('');
        const used = Array(5).fill(false);

        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === targetArr[i]) {
                result[i] = '🟩';
                used[i] = true;
                guessArr[i] = null!;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === null) continue;
            for (let j = 0; j < 5; j++) {
                if (!used[j] && guessArr[i] === targetArr[j]) {
                    result[i] = '🟨';
                    used[j] = true;
                    break;
                }
            }
        }
        return result;
    }
}
