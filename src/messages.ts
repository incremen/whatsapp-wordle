import { Session } from './Session';

function winMessage(session: Session): string {
    const g = session.guesses;
    const h = session.hints;
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

    if (g === 6) return `6/6. That was a struggle. ${h} hint${s} used.`;
    if (h >= 3) return `${g}/6. With ${h} hints, it wasn't exactly a solo effort.`;
    return `${g}/6. You finished, but it cost you ${h} hint${s}.`;
}

export type Messages = {
    start: string;
    noGame: string;
    win: (session: Session) => string;
    lose: (session: Session) => string;
};

export const regularMessages: Messages = {
    start: 'Game started! Use `!guess <word>` to play, `!hint` for a hint.',
    noGame: 'No active game. Send `!wordle` to start one.',
    win: (s) => winMessage(s),
    lose: (s) => `Fool. The word was: '${s.target}'`,
};

export const dailyMessages: Messages = {
    start: 'Daily Wordle! Use `!guess <word>` to play.',
    noGame: 'No active daily. Send `!daily` to start.',
    win: (s) => `Daily done! ${winMessage(s)}`,
    lose: (s) => `The daily word was: '${s.target}'. Better luck tomorrow!`,
};
