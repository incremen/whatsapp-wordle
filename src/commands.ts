import { SessionManager } from './SessionManager';
import { setDisabled } from './disabledChats';
import * as db from './db';

const manager = new SessionManager();

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type Command = { prefix: string; handler: Handler };

export const adminCommands: Command[] = [
    { prefix: '!disable', handler: (msg, chatId) => { setDisabled(chatId, true);  msg.reply('Bot disabled here.'); }},
    { prefix: '!enable',  handler: (msg, chatId) => { setDisabled(chatId, false); msg.reply('Bot enabled here.'); }},
    { prefix: '!recent',  handler: (msg) => { msg.reply(db.getRecentGames()); }},
];

export const commands: Command[] = [
    { prefix: '!wordle', handler: (msg, chatId) => {
        const session = manager.create(chatId, msg.from);
        const guesses = msg.body.slice(7).split(' ').filter((g: string) => g);

        if (!guesses.length) {
            msg.reply('Game started! Use `!guess <word>` to play, `!hint` for a hint.');
            return;
        }

        if (guesses.length > 5) {
            msg.reply('You can only guess up to 5 words from the start.');
            return;
        }

        let lastText = '';
        for (const guess of guesses) {
            const { text, ok } = session.guess(msg.from, guess);
            lastText = text;
            if (!ok || session.done) break;
        }
        if (!session.done) {
            msg.reply(lastText + "\n\nUse `!guess <word>` to play, `!hint` for a hint.")
        }
        else {
        msg.reply(lastText);
        }
        if (session.done) db.saveGame(chatId, session.getGameData());
    }},
    { prefix: '!guess', handler: (msg, chatId, args) => {
        const session = manager.get(chatId);
        if (!session || session.done) { msg.reply('No active game. Send `!wordle` to start one.'); return; }
        const { text } = session.guess(msg.from, args);
        msg.reply(text);
        if (session.done) db.saveGame(chatId, session.getGameData());
    }},
    { prefix: '!stats', handler: (msg) => {
        msg.reply(db.getUserStats(msg.from));
    }},
    { prefix: '!hint', handler: (msg, chatId) => {
        const session = manager.get(chatId);
        if (!session || session.done) { msg.reply('No active game. Send `!wordle` to start one.'); return; }
        msg.reply(session.hint(msg.from));
    }},
];
