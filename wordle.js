const readline = require('readline');

const WORDS = [
    'crane', 'audio'
];

const target = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
const MAX_GUESSES = 6;
let guesses = 0;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function getEmojis(guess) {
    const result = ['⬛', '⬛', '⬛', '⬛', '⬛'];
    const targetArr = target.split('');
    const guessArr = guess.split('');
    const used = Array(5).fill(false);

    // First pass: correct position (blue)
    for (let i = 0; i < 5; i++) {
        if (guessArr[i] === targetArr[i]) {
            result[i] = '🟦';
            used[i] = true;
            guessArr[i] = null;
        }
    }

    // Second pass: wrong position (yellow)
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

function prompt() {
    rl.question(`Guess ${guesses + 1}/${MAX_GUESSES}: `, (input) => {
        const guess = input.trim().toUpperCase();

        if (guess.length !== 5 || !/^[A-Z]+$/.test(guess)) {
            console.log('Enter a 5-letter word.');
            return prompt();
        }

        const emojis = getEmojis(guess);
        console.log(`${guess}: ${emojis}`);
        guesses++;

        if (guess === target) {
            console.log(`\nYou got it in ${guesses}!`);
            rl.close();
        } else if (guesses >= MAX_GUESSES) {
            console.log(`\nThe word was: ${target}`);
            rl.close();
        } else {
            prompt();
        }
    });
}

console.log('=== WORDLE ===');
console.log('🟩 correct  🟨 wrong position  ⬛ not in word\n');
prompt();
