import { SessionManager } from '../game/SessionManager';
import { DailySessionManager } from '../game/DailySessionManager';
import { regularMessages, dailyMessages, Messages } from '../game/messages';
import { Session } from '../game/Session';
import { buildDailyRecap } from '../schedules/dailyRecap';
import * as db from '../infra/db';
import { isQuiet } from '../lists/quiet';
import { client } from '../clientConfig';
import { safeReply } from '../infra/messaging';
import { SurvivalManager } from '../game/SurvivalManager';
import { SurvivalSession } from '../game/SurvivalSession';

const manager = new SessionManager();
const dailyManager = new DailySessionManager();
const survivalManager = new SurvivalManager();

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type WordleCommandMap = Record<string, Handler>;

function messagesFor(session: Session): Messages {
    return session.gameType === 'daily' ? dailyMessages : regularMessages;
}

export const wordleCommands: WordleCommandMap = {

    '!wordle': async (msg, chatId) => {
        const session = manager.create(chatId, msg.senderId);
        const guesses = msg.body.slice(7).split(' ').filter((g: string) => g);

        if (!guesses.length) {
            const sent = await safeReply(client, msg, messagesFor(session).start);
            session.boardMessageId = sent.id._serialized;
            session.boardTimestamp = Date.now();
            return;
        }

        if (guesses.length > 6) {
            await safeReply(client, msg, 'You can only guess up to 6 words from the start.');
            return;
        }

        let lastError = '';
        for (const guess of guesses) {
            const { ok, error } = session.guess(msg.senderId, guess);
            if (!ok) { lastError = error!; break; }
            if (session.done) break;
        }

        if (lastError) { await safeReply(client, msg, lastError); return; }

        const board = session.formatBoard();
        let text: string;
        if (session.won) text = board + '\n\n' + messagesFor(session).win(session);
        else if (session.done) text = board + '\n\n' + messagesFor(session).lose(session);
        else text = board + '\n\n' + messagesFor(session).start;

        const sent = await safeReply(client, msg, text);
        session.boardMessageId = sent.id._serialized;
        session.boardTimestamp = Date.now();

        if (session.done) db.saveGame(chatId, session.getGameData());
    },

    '!survival': async (msg, chatId) => {
        const existing = survivalManager.get(chatId);
        if (existing && !existing.done) {
            const sent = await safeReply(client, msg, existing.formatBoard());
            existing.boardMessageId = sent.id._serialized;
            existing.boardTimestamp = Date.now();
            return;
        }
        const session = survivalManager.create(chatId, msg.senderId);
        const sent = await safeReply(client, msg, session.formatBoard());
        session.boardMessageId = sent.id._serialized;
        session.boardTimestamp = Date.now();
    },

    '!daily': async (msg, chatId) => {
        if (chatId.endsWith('@g.us')) { await safeReply(client, msg, 'DMs only.'); return; }

        const existing = dailyManager.get(msg.senderId);
        if (existing) {
            if (existing.done) { await safeReply(client, msg, "You've already done today's daily."); return; }
            const sent = await safeReply(client, msg, existing.formatBoard());
            existing.boardMessageId = sent.id._serialized;
            existing.boardTimestamp = Date.now();
            return;
        }

        const session = dailyManager.create(msg.senderId);
        if (!session) { await safeReply(client, msg, "You've already done today's daily."); return; }
        const sent = await safeReply(client, msg, dailyMessages.start);
        session.boardMessageId = sent.id._serialized;
        session.boardTimestamp = Date.now();
    },

    '!guess': async (msg, chatId) => {
        const wordle = manager.get(chatId);
        const survival = survivalManager.get(chatId);
        const session = (wordle && !wordle.done) ? wordle
            : (survival && !survival.done) ? survival
            : dailyManager.get(msg.senderId);
        if (!session || session.done) { await safeReply(client, msg, 'No active game. Send `!wordle` to start one.'); return; }

        // Survival mode: separate flow, no quiet mode
        if (session instanceof SurvivalSession) {
            const solvedBefore = session.wordsSolved.length;
            const { ok, error } = session.guess(msg.senderId, msg.body.slice(7));
            if (!ok) { await safeReply(client, msg, error!); return; }

            if (session.wordsSolved.length > solvedBefore) {
                const games = session.getCompletedGameData();
                db.saveGame(chatId, games[games.length - 1]);
            }

            if (session.done) {
                db.saveGame(chatId, session.getLastWordGameData());
            }

            const sent = await safeReply(client, msg, session.formatBoard());
            session.boardMessageId = sent.id._serialized;
            session.boardTimestamp = Date.now();
            return;
        }

        const quiet = isQuiet(chatId);

        const { ok, error } = session.guess(msg.senderId, msg.body.slice(7));
        if (!ok) {
            if (quiet) { await msg.react('❌'); return; }
            await safeReply(client, msg, error!);
            return;
        }

        if (quiet) {
            if (session.won) {
                await msg.react('👑');
            }
            else {
                 await msg.react('✅');
            }
        }

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

        const sent = await safeReply(client, msg, text);
        session.boardMessageId = sent.id._serialized;
        session.boardTimestamp = Date.now();

        if (session.done) db.saveGame(chatId, session.getGameData());
    },

    '!hint': async (msg, chatId) => {
        const wordle = manager.get(chatId);
        const survival = survivalManager.get(chatId);
        const session = (wordle && !wordle.done) ? wordle
            : (survival && !survival.done) ? survival
            : dailyManager.get(msg.senderId);
        if (!session || session.done) { await safeReply(client, msg, 'No active game. Send `!wordle` to start one.'); return; }
        if (session instanceof SurvivalSession) {
            await safeReply(client, msg, 'No hints in survival mode!');
            return;
        }
        if (session.gameType === 'daily') {
            await safeReply(client, msg, "No hints for a daily game!")
            return
        }
        if (session.hints >= 5) {
            await safeReply(client, msg, "What more is there to know?");
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

        const sent = await safeReply(client, msg, text);
        session.boardMessageId = sent.id._serialized;
        session.boardTimestamp = Date.now();
    },

    '!dailystats': async (msg, chatId) => {
        if (!chatId.endsWith('@g.us')) { await safeReply(client, msg, 'GCs only.'); return; }
        const chat = await msg.getChat();
        const participants = chat.participants?.map((p: any) => p.id._serialized) ?? [];
        const { text, mentions } = buildDailyRecap(participants);
        await safeReply(client, msg, text, { mentions });
    },

    '!stats': async (msg) => {
        await safeReply(client, msg, db.getUserStats(msg.senderId));
    },

    '!botstats': async (msg) => {
        await safeReply(client, msg, db.getBotStats());
    },

};
