import * as readline from 'readline';
import { SessionManager } from './SessionManager';
import { MAX_GUESSES } from './Session';

const manager = new SessionManager();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function prompt(): void {
    const session = manager.getOrCreate('me');
    rl.question(`Guess ${session.guesses + 1}/${MAX_GUESSES}:\n`, (input: string) => {
        const result = session.guess(input);
        console.log(result + '\n');
        if (session.done) return rl.close();
        prompt();
    });
}

prompt();
