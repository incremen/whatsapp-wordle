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
        manager.create(chatId, msg.from);
        msg.reply('Game started! Use `!guess <word>` to play, `!hint` for a hint.');
    }},
    { prefix: '!guess', handler: (msg, chatId, args) => {
        const session = manager.get(chatId);
        if (!session || session.done) { msg.reply('No active game. Send `!wordle` to start one.'); return; }
        msg.reply(session.guess(msg.from, args));
        if (session.done) db.saveGame(chatId, session.getGameData());
    }},
    { prefix: '!hint', handler: (msg, chatId) => {
        const session = manager.get(chatId);
        if (!session || session.done) { msg.reply('No active game. Send `!wordle` to start one.'); return; }
        msg.reply(session.hint(msg.from));
    }},
];
