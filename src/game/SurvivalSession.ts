import { Session } from './Session';

const STARTING_GUESSES = 10;

export class SurvivalSession {
    currentSession: Session;
    guessesLeft: number = STARTING_GUESSES;
    wordsSolved: string[] = [];
    done: boolean = false;
    justSolved: boolean = false;
    startedBy: string;
    startedAt: number = Date.now();
    boardMessageId: string = '';
    boardTimestamp: number = 0;

    constructor(startedBy: string) {
        this.startedBy = startedBy;
        this.currentSession = new Session(startedBy);
    }

    guess(userId: string, input: string): { ok: boolean; error?: string } {
        const result = this.currentSession.guess(userId, input);
        if (!result.ok) return result;

        this.guessesLeft--;
        this.justSolved = false;

        if (this.currentSession.won) {
            const bonus = 7 - this.currentSession.guesses;
            this.guessesLeft += bonus;
            this.wordsSolved.push(this.currentSession.target);
            this.justSolved = true;
            this.currentSession = new Session(this.startedBy);
        } else if (this.guessesLeft <= 0) {
            this.done = true;
        }

        return { ok: true };
    }

    formatBoard(): string {
        const header = `*Survival Mode*\nGuesses left: ${this.guessesLeft} | Words solved: ${this.wordsSolved.length}`;

        if (this.done) {
            const words = this.wordsSolved.length
                ? this.wordsSolved.join(', ')
                : 'None';
            return `${header}\n\nGame over! Words solved: ${words}`;
        }

        const solved = this.justSolved ? `Nice job! Moving on...\n\n` : '';
        return `${header}\n\n${solved}${this.currentSession.formatBoard()}`;
    }
}
