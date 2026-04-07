import * as fs from 'fs';
import * as path from 'path';

function loadWords(file: string): string[] {
    return fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf-8')
        .split('\n').map(w => w.trim()).filter(w => w.length === 5);
}

const VALID_GUESSES = new Set(loadWords('valid-guesses.txt'));
const VALID_TARGETS = loadWords('valid-targets.txt');
export const MAX_GUESSES = 6;

export const CORRECT = '🟩';
export const MISPLACED = '🟨';
export const WRONG = '⬛';
export const AVAILABLE = '⬜';

export type BoardRow = {
    type: 'guess' | 'hint';
    userId: string;
    guess: string;
    emojis: string[];
}

export type GameType = 'regular' | 'daily';

export class Session {
    target: string;
    gameType: GameType;
    guesses: number = 0;
    hints: number = 0;
    board: BoardRow[] = [];
    done: boolean = false;
    won: boolean = false;
    startedBy: string;
    startedAt: number = Date.now();
    found: string[] = Array(5).fill('_');
    misplaced = new Set<string>();
    eliminated = new Set<string>();

    constructor(startedBy: string, gameType: GameType = 'regular', target?: string) {
        this.startedBy = startedBy;
        this.gameType = gameType;
        this.target = target?.toUpperCase() ?? VALID_TARGETS[Math.floor(Math.random() * VALID_TARGETS.length)].toUpperCase();
    }

    guess(userId: string, input: string): { ok: boolean; error?: string } {
        const word = input.trim().toUpperCase();

        if (word.length !== 5 || !/^[A-Z]+$/.test(word)) {
            return { ok: false, error: 'Enter a 5-letter word.' };
        }
        if (!VALID_GUESSES.has(word.toLowerCase())) {
            return { ok: false, error: 'Not a valid word.' };
        }

        const emojis = this.getGuessEmojis(word);
        this.board.push({ type: 'guess', userId, guess: word, emojis });
        this.guesses++;
        this.updateLetterState(word, emojis);
        this.updateDoneWon();

        return { ok: true };
    }

    hint(userId: string): void {
        const not_green_indexes = [0,1,2,3,4].filter(i => this.found[i] === '_');
        const random_idx = not_green_indexes[Math.floor(Math.random() * not_green_indexes.length)];

        const emojis: string[] = Array(5).fill(WRONG);
        emojis[random_idx] = CORRECT;
        this.board.push({ type: 'hint', userId, guess: "HINT ", emojis });
        this.hints++;

        this.found[random_idx] = this.target[random_idx];
        this.misplaced.delete(this.target[random_idx]);
        this.eliminated.delete(this.target[random_idx]);

        this.updateDoneWon();
    }

    formatBoard(): string {
        const history = '```' + this.board.map(r => `${r.guess}: ${r.emojis.join('')}`).join('\n') + '```';
        if (!this.done) return history + '\n\n' + this.getDashboard();
        return history;
    }

    private getDashboard(): string {
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

    getGameData() {
        return {
            startedBy: this.startedBy,
            target: this.target,
            won: this.won,
            startedAt: this.startedAt,
            moves: this.board.map(r => ({ type: r.type, userId: r.userId, value: r.guess, result: r.emojis.join('') })),
        };
    }

    private updateDoneWon() {
        const lastRow = this.board[this.board.length - 1];
        if (lastRow.emojis.every(e => e === CORRECT)) {
            this.done = true;
            this.won = true;
        } else if (this.guesses >= MAX_GUESSES) {
            this.done = true;
        }
    }

    private updateLetterState(word: string, emojis: string[]): void {
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
        for (const letter of this.found) {
            if (letter !== '_') { this.eliminated.delete(letter); this.misplaced.delete(letter); }
        }
        for (const letter of this.misplaced) this.eliminated.delete(letter);
    }

    private getGuessEmojis(guess: string): string[] {
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
