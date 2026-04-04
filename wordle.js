const readline = require('readline');

const WORDS = [
    'crane', 'audio'
];

const target = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
const MAX_GUESSES = 6;
let guesses = 0;
const board = [];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function getEmojis(guess) {
    const result = ['⬛', '⬛', '⬛', '⬛', '⬛'];
    const targetArr = target.split('');
    const guessArr = guess.split('');
    const used = Array(5).fill(false);

    for (let i = 0; i < 5; i++) {
        if (guessArr[i] === targetArr[i]) {
            result[i] = '🟦';
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

function printBoard() {
    for (const row of board) {
        console.log(`${row.guess}: ${row.emojis}`);
    }
    if (board.length > 0) console.log('');
}

function prompt() {
    printBoard();
    rl.question(`Guess ${guesses + 1}/${MAX_GUESSES}:\n`, (input) => {
        const guess = input.trim().toUpperCase();

        if (guess.length !== 5 || !/^[A-Z]+$/.test(guess)) {
            console.log('Enter a 5-letter word.');
            return prompt();
        }

        const emojis = getEmojis(guess);
        board.push({ guess, emojis });
        guesses++;

        if (guess === target) {
            printBoard();
            console.log(`You got it in ${guesses}!`);
            rl.close();
        } else if (guesses >= MAX_GUESSES) {
            printBoard();
            console.log(`The word was: ${target}`);
            rl.close();
        } else {
            prompt();
        }
    });
}

prompt();
