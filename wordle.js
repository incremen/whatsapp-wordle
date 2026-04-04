const readline = require('readline');

const WORDS = ['crane', 'audio'];
const MAX_GUESSES = 6;

class Session {
    constructor() {
        this.target = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
        this.guesses = 0;
        this.board = [];
        this.done = false;
    }

    guess(input) {
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

    getBoardText() {
        return this.board.map(r => `${r.guess}: ${r.emojis}`).join('\n');
    }

    _getGuessEmojis(guess) {
        const result = ['⬛', '⬛', '⬛', '⬛', '⬛'];
        const targetArr = this.target.split('');
        const guessArr = guess.split('');
        const used = Array(5).fill(false);

        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === targetArr[i]) {
                result[i] = '🟩';
                used[i] = true;
                guessArr[i] = null;
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

class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    getOrCreate(userId) {
        if (!this.sessions.has(userId) || this.sessions.get(userId).done) {
            this.sessions.set(userId, new Session());
        }
        return this.sessions.get(userId);
    }
}

const manager = new SessionManager();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function prompt() {
    const session = manager.getOrCreate('me');
    rl.question(`Guess ${session.guesses + 1}/${MAX_GUESSES}:\n`, (input) => {
        const result = session.guess(input);

        if (result.error) {
            console.log(result.error);
        } else {
            console.log(session.getBoardText() + '\n');
            if (result.won) { console.log(`You got it in ${result.guesses}!`); return rl.close(); }
            if (result.lost) { console.log(`The word was: ${result.target}`); return rl.close(); }
        }
        prompt();
    });
}

prompt();
