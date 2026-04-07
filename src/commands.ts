import { SessionManager } from './game/SessionManager';
import { DailySessionManager } from './game/DailySessionManager';
import { setDisabled } from './infra/disabledChats';
import { setDailyBoard } from './infra/dailyBoard';
import { setStartupChat } from './infra/startupChats';
import { setSnapshotChat } from './infra/snapshotChats';
import { regularMessages, dailyMessages, Messages } from './game/messages';
import { Session } from './game/Session';
import { buildDailyRecap } from './game/dailyBoardScheduler';
import * as db from './infra/db';
import * as path from 'path';
const { MessageMedia } = require('whatsapp-web.js');

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
    '!dailyboard': (msg, chatId, args) => {
        if (!chatId.endsWith('@g.us')) { msg.reply('GCs only.'); return; }
        if (args === 'enable') {
            setDailyBoard(chatId, true);
            msg.reply('Daily board enabled! At midnight, this chat will get a daily recap.');
        } else if (args === 'disable') {
            setDailyBoard(chatId, false);
            msg.reply('Daily board disabled.');
        } else {
            msg.reply('Usage: `!dailyboard enable` or `!dailyboard disable`');
        }
    },
    '!snapshot': (msg) => {
        const dbPath = path.join(__dirname, '..', 'data', 'wordle.db');
        const media = MessageMedia.fromFilePath(dbPath);
        msg.reply(media);
    },
    '!dailysnapshot': (msg, chatId, args) => {
        if (args === 'enable') {
            setSnapshotChat(chatId, true);
            msg.reply('Daily snapshot enabled. DB backup will be sent here at midnight.');
        } else if (args === 'disable') {
            setSnapshotChat(chatId, false);
            msg.reply('Daily snapshot disabled.');
        } else {
            msg.reply('Usage: `!dailysnapshot enable` or `!dailysnapshot disable`');
        }
    },
    '!startupmessage': (msg, chatId, args) => {
        if (args === 'enable') {
            setStartupChat(chatId, true);
            msg.reply('This chat will be notified when the bot starts up.');
        } else if (args === 'disable') {
            setStartupChat(chatId, false);
            msg.reply('Startup notifications disabled.');
        } else {
            msg.reply('Usage: `!startupmessage enable` or `!startupmessage disable`');
        }
    },

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
        if (session.hints >= 5) {
            msg.reply("What more is there to know?");
            return
        }
        session.hint(msg.from);
        msg.reply(session.formatBoard());
    },

    '!dailystats': async (msg, chatId) => {
        if (!chatId.endsWith('@g.us')) { msg.reply('GCs only.'); return; }
        const chat = await msg.getChat();
        const participants = chat.participants?.map((p: any) => p.id._serialized) ?? [];
        const { text, mentions } = buildDailyRecap(participants);
        msg.reply(text, undefined, { mentions });
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
