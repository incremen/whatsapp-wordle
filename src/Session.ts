import * as fs from 'fs';
import * as path from 'path';

function loadWords(file: string): string[] {
    return fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf-8')
        .split('\n').map(w => w.trim()).filter(w => w.length === 5);
}

const VALID_GUESSES = new Set(loadWords('valid-guesses.txt'));
const VALID_TARGETS = loadWords('valid-targets.txt');
export const MAX_GUESSES = 6;

const CORRECT = '🟩';
const MISPLACED = '🟨';
const WRONG = '⬛';
const AVAILABLE = '⬜';


type BoardRow = {
    guess: string;
    emojis: string[];
}

export class Session {
    target: string;
    guesses: number = 0;
    hints : number = 0;
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

        this.updateDoneWon();

        return this.getBoardText();
    }

    private updateDoneWon() {
        const lastRow = this.board[this.board.length - 1];
        
        if (lastRow.emojis.every(e => e === CORRECT)) {
            this.done = true;
            this.won = true;
        } 
        else if (this.guesses >= MAX_GUESSES) {
            this.done = true;
        }
    }

    hint() : string {
        const not_green_indexes = [0,1,2,3,4].filter(i => this.found[i] === '_');
        const random_idx = not_green_indexes[Math.floor(Math.random() * not_green_indexes.length)];

        const emojis: string[] = Array(5).fill(WRONG);
        emojis[random_idx] = CORRECT;
        this.board.push({guess: "HINT ", emojis});
        this.hints++;

        this.found[random_idx] = this.target[random_idx];
        this.misplaced.delete(this.target[random_idx]);
        this.eliminated.delete(this.target[random_idx]);

        this.updateDoneWon();
        return this.getBoardText();
    }


    getBoardText(): string {
        const history = '```' + this.board.map(r => `${r.guess}: ${r.emojis.join('')}`).join('\n') + '```';
        const dashboard = this.done ? '' : '\n\n' + this._getDashboard();
        if (this.won) return `${history}\n\n${this._getWinMessage()}`;
        if (this.done) return `${history}\n\nFool. The word was: '${this.target}'`;
        return history + dashboard;
    }

private _getWinMessage(): string {
    const g = this.guesses;
    const h = this.hints;
    const s = h === 1 ? '' : 's';

    if (h === 0) {
        if (g === 1) return `Got it in 1/6. Lucky bastard.`;
        if (g === 2) return `Got it in 2/6. WOW!`;
        if (g === 3) return `Got it in 3/6. Very good!`;
        if (g === 4) return `Got it in 4/6. Nicely done.`;
        if (g === 5) return `Got it in 5/6. Decent.`;
        return `Got it in 6/6. Hard word? Or word hard?`;
    }

    if (h === 1) {
        if (g <= 3) return `${g}/6. Fast, but with a hint`;
        if (g <= 5) return `${g}/6. Decent, but with a hint.`;
        return `6/6. You barely made it, even with a hint.`;
    }

    if (g === 6) {
        return `6/6. That was a struggle. ${h} hint${s} used.`;
    }
    if (h >= 3) {
        return `${g}/6. With ${h} hints, it wasn't exactly a solo effort.`;
    }

    return `${g}/6. You finished, but it cost you ${h} hint${s}.`;
}

    private _updateLetterState(word: string, emojis: string[]): void {
        for (let i = 0; i < 5; i++) {
            const letter = word[i];
            if (emojis[i] === CORRECT) {
                this.found[i] = letter;
            } else if (emojis[i] === MISPLACED) {
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
            `${CORRECT} Found:      ${this.found.join(' ')}`,
            `${MISPLACED} Misplaced:  ${[...this.misplaced].join(', ') || '-'}`,
            `${WRONG} Eliminated: ${[...this.eliminated].join(', ') || '-'}`,
            `${AVAILABLE} Available:  ${available.join(', ')}`,
        ];
        return '```' + lines.join('\n') + '```';
    }

    private _getGuessEmojis(guess: string): string[] {
        const result = [WRONG, WRONG, WRONG, WRONG, WRONG];
        const targetArr = this.target.split('');
        const guessArr = guess.split('');
        const used = Array(5).fill(false);

        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === targetArr[i]) {
                result[i] = CORRECT;
                used[i] = true;
                guessArr[i] = null!;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === null) continue;
            for (let j = 0; j < 5; j++) {
                if (!used[j] && guessArr[i] === targetArr[j]) {
                    result[i] = MISPLACED;
                    used[j] = true;
                    break;
                }
            }
        }
        return result;
    }
}
