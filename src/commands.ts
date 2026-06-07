import { setDisabled } from './lists/disabled';
import { setDailyBoard } from './lists/dailyBoard';
import { setStartupChat } from './lists/startup';
import { setSnapshotChat } from './lists/snapshot';
import * as db from './infra/db';
import { buildSnapshotMedia } from './schedules/snapshot';
import { setQuiet } from './lists/quiet';
import { client } from './clientConfig';
import { safeReply } from './infra/safeReply';

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type CommandMap = Record<string, Handler>;


export const devCommands: CommandMap = {

    '!snapshot': async (msg) => {
        await safeReply(client, msg, buildSnapshotMedia(), { sendMediaAsDocument: true });
    },
    '!dailysnapshot': async (msg, chatId, args) => {
        if (args === 'enable') {
            setSnapshotChat(chatId, true);
            await safeReply(client, msg, 'Daily snapshot enabled. DB backup will be sent here daily (forgot when tho).');
        } else if (args === 'disable') {
            setSnapshotChat(chatId, false);
            await safeReply(client, msg, 'Daily snapshot disabled.');
        } else {
            await safeReply(client, msg, 'Usage: `!dailysnapshot enable` or `!dailysnapshot disable`');
        }
    },
    '!recent': async (msg) => { await safeReply(client, msg, db.getRecentGames()); },

};


export const adminCommands: CommandMap = {

    '!disable': async (msg, chatId) => { setDisabled(chatId, true);  await safeReply(client, msg, 'Bot disabled here.'); },
    '!enable':  async (msg, chatId) => { setDisabled(chatId, false); await safeReply(client, msg, 'Bot enabled here.'); },
    '!dailyboard': async (msg, chatId, args) => {
        if (!chatId.endsWith('@g.us')) { await safeReply(client, msg, 'GCs only.'); return; }
        if (args === 'enable') {
            setDailyBoard(chatId, true);
            await safeReply(client, msg, 'Daily board enabled! At midnight, this chat will get a daily recap.');
        } else if (args === 'disable') {
            setDailyBoard(chatId, false);
            await safeReply(client, msg, 'Daily board disabled.');
        } else {
            await safeReply(client, msg, 'Usage: `!dailyboard enable` or `!dailyboard disable`');
        }
    },
    '!quiet': async (msg, chatId, args) => {
        if (args === 'enable') {
            setQuiet(chatId, true);
            await safeReply(client, msg, 'Quiet mode enabled. Board updates will edit the original message instead of spamming new ones.');
        } else if (args === 'disable') {
            setQuiet(chatId, false);
            await safeReply(client, msg, 'Quiet mode disabled.');
        } else {
            await safeReply(client, msg, 'Usage: `!quiet enable` or `!quiet disable`');
        }
    },
    '!startupmessage': async (msg, chatId, args) => {
        if (args === 'enable') {
            setStartupChat(chatId, true);
            await safeReply(client, msg, 'This chat will be notified when the bot starts up.');
        } else if (args === 'disable') {
            setStartupChat(chatId, false);
            await safeReply(client, msg, 'Startup notifications disabled.');
        } else {
            await safeReply(client, msg, 'Usage: `!startupmessage enable` or `!startupmessage disable`');
        }
    },

};


export const commands: CommandMap = {

    '!help': async (msg) => {
        const lines = [
            '*Botanar*',
            '`!help` — this message',
            '',
            '*Wordle:*',
            '`!wordle` — start a new game',
            '`!guess <word>` — make a guess',
            '`!wordle <word1> <word2> ...` — start with pre-guesses',
            '`!daily` — daily challenge (DMs only)',
            '`!survival` — endless mode, guess until you run out',
            '`!hint` — reveal one correct letter',
            '`!stats` — your stats',
            '`!dailystats` — daily recap (GCs only)',
            '`!botstats` — global bot stats',
            '',
            '*Admin (GC only):*',
            '`!disable` / `!enable` — toggle bot in this chat',
            '`!quiet enable/disable` — less spam: edits board in place, reacts to guesses',
            '`!dailyboard enable/disable` — daily recap at midnight',
            '`!startupmessage enable/disable` — get notified when bot comes online',
            '',
            '*Last.fm:*',
            '`!fm set <username>` — link your Last.fm account',
            '`!fm np` — now playing / last scrobbled',
            '`!fm chart [size] [period]` — album art grid (e.g. `!fm chart 4x4 monthly`)',
            '`!fm toptracks [period]` — top 10 tracks',
            '`!fm topartists [period]` — top 10 artists',
            '`!fm profile` — your scrobble stats',
            '`!fm unset` — unlink account',
            "Don't have Last.fm? Sign up and enable scrobbling: https://www.last.fm/join",
            '',
            '*LaTeX:*',
            '`!l <expression>` — render LaTeX as a sticker',
            '',
            '*Meme:*',
            '`!caption <text>` — send or reply to an image to add a caption',
            '',
            '*Translate:*',
            '`!translate <language> <text>` — translate text (or reply to a message)',
            '',
            'Github: https://github.com/incremen/whatsapp-wordle',
        ];
        await safeReply(client, msg, lines.join('\n'));
    },

};
