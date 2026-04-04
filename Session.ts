const WORDS = ['crane', 'audio'];
export const MAX_GUESSES = 6;

type GuessResult =
    | { error: string }
    | { won: true; guesses: number }
    | { lost: true; target: string }
    | { continue: true };

type BoardRow = {
    guess: string;
    emojis: string;
}

export class Session {
    target: string;
    guesses: number = 0;
    board: BoardRow[] = [];
    done: boolean = false;

    constructor() {
        this.target = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
    }

    guess(input: string): GuessResult {
        console.log(`got guess ${input}`)
        const word = input.trim().toUpperCase();

        if (word.length !== 5 || !/^[A-Z]+$/.test(word)) {
            return { error: 'Enter a 5-letter word.' };
        }

        const emojis = this._getGuessEmojis(word);
        this.board.push({ guess: word, emojis });
        this.guesses++;

        if (word === this.target) {
            this.done = true;
            return { won: true, guesses: this.guesses };
        }
        if (this.guesses >= MAX_GUESSES) {
            this.done = true;
            return { lost: true, target: this.target };
        }
        return { continue: true };
    }

    getBoardText(): string {
        return this.board.map(r => `${r.guess}: ${r.emojis}`).join('\n');
    }

    private _getGuessEmojis(guess: string): string {
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
        return result.join('');
    }
}
