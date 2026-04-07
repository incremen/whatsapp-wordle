import { SessionManager } from './SessionManager';
import { DailySessionManager } from './DailySessionManager';
import { setDisabled } from './disabledChats';
import { regularMessages, dailyMessages, Messages } from './messages';
import { Session } from './Session';
import * as db from './db';

const manager = new SessionManager();
const dailyManager = new DailySessionManager();

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type CommandMap = Record<string, Handler>;

function messagesFor(session: Session): Messages {
    return session.gameType === 'daily' ? dailyMessages : regularMessages;
}

// --- Admin commands (owner only) ---

export const adminCommands: CommandMap = {

    '!disable': (msg, chatId) => { setDisabled(chatId, true);  msg.reply('Bot disabled here.'); },
    '!enable':  (msg, chatId) => { setDisabled(chatId, false); msg.reply('Bot enabled here.'); },
    '!recent':  (msg) => { msg.reply(db.getRecentGames()); },

};

// --- Public commands ---

export const commands: CommandMap = {

    '!wordle': (msg, chatId) => {
        const session = manager.create(chatId, msg.from);
        const guesses = msg.body.slice(7).split(' ').filter((g: string) => g);

        if (!guesses.length) {
            msg.reply(messagesFor(session).start);
            return;
        }

        if (guesses.length > 6) {
            msg.reply('You can only guess up to 6 words from the start.');
            return;
        }

        let lastError = '';
        for (const guess of guesses) {
            const { ok, error } = session.guess(msg.from, guess);
            if (!ok) { lastError = error!; break; }
            if (session.done) break;
        }

        if (lastError) { msg.reply(lastError); return; }

        const board = session.formatBoard();
        if (session.won) msg.reply(board + '\n\n' + messagesFor(session).win(session));
        else if (session.done) msg.reply(board + '\n\n' + messagesFor(session).lose(session));
        else msg.reply(board + '\n\n' + messagesFor(session).start);

        if (session.done) db.saveGame(chatId, session.getGameData());
    },

    '!daily': (msg, chatId) => {
        if (chatId.endsWith('@g.us')) { msg.reply('DMs only.'); return; }
        const session = dailyManager.create(msg.from);
        if (!session) { msg.reply("You've already done today's daily."); return; }
        msg.reply(dailyMessages.start);
    },

    '!guess': (msg, chatId) => {
        const session = manager.get(chatId) ?? dailyManager.get(msg.from);
        if (!session || session.done) { msg.reply('No active game. Send `!wordle` to start one.'); return; }

        const { ok, error } = session.guess(msg.from, msg.body.slice(7));
        if (!ok) { msg.reply(error!); return; }

        const board = session.formatBoard();
        if (session.won) msg.reply(board + '\n\n' + messagesFor(session).win(session));
        else if (session.done) msg.reply(board + '\n\n' + messagesFor(session).lose(session));
        else msg.reply(board);

        if (session.done) db.saveGame(chatId, session.getGameData());
    },

    '!hint': (msg, chatId) => {
        const session = manager.get(chatId) ?? dailyManager.get(msg.from);
        if (!session || session.done) { msg.reply('No active game. Send `!wordle` to start one.'); return; }
        if (session.gameType === 'daily') {
            msg.reply("No hints for a daily game!")
            return
        }
        session.hint(msg.from);
        msg.reply(session.formatBoard());
    },

    '!stats': (msg) => {
        msg.reply(db.getUserStats(msg.from));
    },

    '!help': (msg) => {
        const lines = [
            '*Wordle Bot*',
            '`!wordle` — start a new game',
            '`!guess <word>` — make a guess',
            '`!wordle <word1> <word2> ...` — start new game with pre-guesses',
            '`!daily` — daily challenge (DMs only)',
            '`!hint` — reveal one correct letter',
            '`!stats` — your stats',
            'Github: https://github.com/incremen/whatsapp-wordle',
        ];
        msg.reply(lines.join('\n'));
    },

};
