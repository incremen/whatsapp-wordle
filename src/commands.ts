import { SessionManager } from './game/SessionManager';
import { DailySessionManager } from './game/DailySessionManager';
import { setDisabled } from './lists/disabled';
import { setDailyBoard } from './lists/dailyBoard';
import { setStartupChat } from './lists/startup';
import { setSnapshotChat } from './lists/snapshot';
import { regularMessages, dailyMessages, Messages } from './game/messages';
import { Session } from './game/Session';
import { buildDailyRecap } from './schedules/dailyRecap';
import * as db from './infra/db';
import { buildSnapshotMedia } from './schedules/snapshot';
import { isQuiet, setQuiet } from './lists/quiet';
import { client } from './clientConfig';

const manager = new SessionManager();
const dailyManager = new DailySessionManager();

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type CommandMap = Record<string, Handler>;

function messagesFor(session: Session): Messages {
    return session.gameType === 'daily' ? dailyMessages : regularMessages;
}


export const devCommands: CommandMap = {

    '!snapshot': (msg) => {
        msg.reply(buildSnapshotMedia(), undefined, { sendMediaAsDocument: true });
    },
    '!dailysnapshot': (msg, chatId, args) => {
        if (args === 'enable') {
            setSnapshotChat(chatId, true);
            msg.reply('Daily snapshot enabled. DB backup will be sent here daily (forgot when tho).');
        } else if (args === 'disable') {
            setSnapshotChat(chatId, false);
            msg.reply('Daily snapshot disabled.');
        } else {
            msg.reply('Usage: `!dailysnapshot enable` or `!dailysnapshot disable`');
        }
    },
    '!recent': (msg) => { msg.reply(db.getRecentGames()); },

};


export const adminCommands: CommandMap = {

    '!disable': (msg, chatId) => { setDisabled(chatId, true);  msg.reply('Bot disabled here.'); },
    '!enable':  (msg, chatId) => { setDisabled(chatId, false); msg.reply('Bot enabled here.'); },
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
    '!quiet': (msg, chatId, args) => {
        if (args === 'enable') {
            setQuiet(chatId, true);
            msg.reply('Quiet mode enabled. Board updates will edit the original message instead of spamming new ones.');
        } else if (args === 'disable') {
            setQuiet(chatId, false);
            msg.reply('Quiet mode disabled.');
        } else {
            msg.reply('Usage: `!quiet enable` or `!quiet disable`');
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


export const commands: CommandMap = {

    '!wordle': async (msg, chatId) => {
        const session = manager.create(chatId, msg.senderId);
        const guesses = msg.body.slice(7).split(' ').filter((g: string) => g);

        if (!guesses.length) {
            const sent = await msg.reply(messagesFor(session).start);
            session.boardMessageId = sent.id._serialized;
            session.boardTimestamp = Date.now();
            return;
        }

        if (guesses.length > 6) {
            msg.reply('You can only guess up to 6 words from the start.');
            return;
        }

        let lastError = '';
        for (const guess of guesses) {
            const { ok, error } = session.guess(msg.senderId, guess);
            if (!ok) { lastError = error!; break; }
            if (session.done) break;
        }

        if (lastError) { msg.reply(lastError); return; }

        const board = session.formatBoard();
        let text: string;
        if (session.won) text = board + '\n\n' + messagesFor(session).win(session);
        else if (session.done) text = board + '\n\n' + messagesFor(session).lose(session);
        else text = board + '\n\n' + messagesFor(session).start;

        const sent = await msg.reply(text);
        session.boardMessageId = sent.id._serialized;
        session.boardTimestamp = Date.now();

        if (session.done) db.saveGame(chatId, session.getGameData());
    },

    '!daily': async (msg, chatId) => {
        if (chatId.endsWith('@g.us')) { msg.reply('DMs only.'); return; }
        const session = dailyManager.create(msg.senderId);
        if (!session) { msg.reply("You've already done today's daily."); return; }
        const sent = await msg.reply(dailyMessages.start);
        session.boardMessageId = sent.id._serialized;
        session.boardTimestamp = Date.now();
    },

    '!guess': async (msg, chatId) => {
        const session = manager.get(chatId) ?? dailyManager.get(msg.senderId);
        if (!session || session.done) { msg.reply('No active game. Send `!wordle` to start one.'); return; }

        const quiet = isQuiet(chatId);

        const { ok, error } = session.guess(msg.senderId, msg.body.slice(7));
        if (!ok) {
            if (quiet) { await msg.react('❌'); return; }
            msg.reply(error!);
            return;
        }

        if (quiet) await msg.react('✅');

        const board = session.formatBoard();
        let text: string;
        if (session.won) text = board + '\n\n' + messagesFor(session).win(session);
        else if (session.done) text = board + '\n\n' + messagesFor(session).lose(session);
        else text = board;

        if (quiet && session.boardMessageId) {
            const isEditable = (Date.now() - session.boardTimestamp) < (14 * 60 * 1000);
            if (isEditable) {
                try {
                    const boardMsg = await client.getMessageById(session.boardMessageId);
                    await boardMsg.edit(text);
                    if (session.done) db.saveGame(chatId, session.getGameData());
                    return;
                } catch {}
            }
        }

        // Fallback: send new message (always used in non-quiet, or when edit fails/expired)
        const sent = await msg.reply(text);
        session.boardMessageId = sent.id._serialized;
        session.boardTimestamp = Date.now();

        if (session.done) db.saveGame(chatId, session.getGameData());
    },

    '!hint': async (msg, chatId) => {
        const session = manager.get(chatId) ?? dailyManager.get(msg.senderId);
        if (!session || session.done) { msg.reply('No active game. Send `!wordle` to start one.'); return; }
        if (session.gameType === 'daily') {
            msg.reply("No hints for a daily game!")
            return
        }
        if (session.hints >= 5) {
            msg.reply("What more is there to know?");
            return
        }
        session.hint(msg.senderId);

        const quiet = isQuiet(chatId);
        if (quiet) await msg.react('💡');

        const text = session.formatBoard();

        if (quiet && session.boardMessageId) {
            const isEditable = (Date.now() - session.boardTimestamp) < (14 * 60 * 1000);
            if (isEditable) {
                try {
                    const boardMsg = await client.getMessageById(session.boardMessageId);
                    await boardMsg.edit(text);
                    return;
                } catch {}
            }
        }

        const sent = await msg.reply(text);
        session.boardMessageId = sent.id._serialized;
        session.boardTimestamp = Date.now();
    },

    '!dailystats': async (msg, chatId) => {
        if (!chatId.endsWith('@g.us')) { msg.reply('GCs only.'); return; }
        const chat = await msg.getChat();
        const participants = chat.participants?.map((p: any) => p.id._serialized) ?? [];
        const { text, mentions } = buildDailyRecap(participants);
        msg.reply(text, undefined, { mentions });
    },

    '!stats': (msg) => {
        msg.reply(db.getUserStats(msg.senderId));
    },

    '!botstats': (msg) => {
        msg.reply(db.getBotStats());
    },

    '!help': (msg) => {
        const lines = [
            '*Commands:*',
            '`!wordle` — start a new game',
            '`!guess <word>` — make a guess',
            '`!wordle <word1> <word2> ...` — start with pre-guesses',
            '`!daily` — daily challenge (DMs only)',
            '`!hint` — reveal one correct letter',
            '`!stats` — your stats',
            '`!dailystats` — daily recap (GCs only)',
            '`!botstats` — global bot stats',
            '',
            '*Groupchat admin commands:*',
            '`!disable` / `!enable` — toggle bot in this chat',
            '`!quiet enable/disable` — less spam: edits board in place, reacts to guesses',
            '`!dailyboard enable/disable` — daily recap at midnight',
            '`!startupmessage enable/disable` — get notified when bot comes online',
            'Github: https://github.com/incremen/whatsapp-wordle',
        ];
        msg.reply(lines.join('\n'));
    },

};
