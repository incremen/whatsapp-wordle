import * as readline from 'readline';
import { SessionManager } from './SessionManager';
import { MAX_GUESSES } from './Session';

const manager = new SessionManager();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function prompt(): void {
    const session = manager.getOrCreate('me');
    rl.question(`Guess ${session.guesses + 1}/${MAX_GUESSES}:\n`, (input: string) => {
        const result = session.guess(input);

        if ('error' in result) {
            console.log(result.error);
        } else {
            console.log(session.getBoardText() + '\n');
            if ('won' in result) { console.log(`You got it in ${result.guesses}!`); return rl.close(); }
            if ('lost' in result) { console.log(`The word was: ${result.target}`); return rl.close(); }
        }
        prompt();
    });
}

prompt();
