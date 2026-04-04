const readline = require('readline');
const { SessionManager } = require('./SessionManager');
const { MAX_GUESSES } = require('./Session');

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
