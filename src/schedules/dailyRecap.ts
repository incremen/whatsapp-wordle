import cron from 'node-cron';
import { getDailyBoardChats } from '../lists/dailyBoard';
import { getUserDailyResult, getGroupDailyStreak } from '../infra/db';
import { todayDate, yesterdayDate } from '../infra/time';
import { log } from '../infra/logger';

let scheduled = false;

export function startDailyBoardScheduler(client: any) {
    if (scheduled) { log('Daily board scheduler already running, skipping'); return; }
    scheduled = true;

    cron.schedule('1 0 * * *', async () => {
        log('Daily board cron fired');
        const date = yesterdayDate();
        for (const chatId of getDailyBoardChats()) {
            const chat = await client.getChatById(chatId);
            const { text, mentions } = buildDailyRecap(chat.participants?.map((p: any) => p.id._serialized) ?? [], date);
            await chat.sendMessage(text, { mentions });
        }
    }, { timezone: 'Asia/Jerusalem' });

    log('Daily board scheduler started (cron: 00:01 IST)');
}

export function buildDailyRecap(participants: string[], date?: string): { text: string; mentions: string[] } {
    const recapDate = date ?? todayDate();
    const lines: string[] = [];
    const mentions: string[] = [];

    for (const userId of participants) {
        const result = getUserDailyResult(userId, recapDate);
        if (!result) continue;

        const status = result.won ? `✅ ${result.guesses}/6` : '❌';
        lines.push(`@${userId.replace('@c.us', '')}: ${status} (🔥 ${result.streak})`);
        mentions.push(userId);
    }

    const header = `📊 *Daily Wordle Recap — ${recapDate}*`;

    if (!lines.length) {
        return { text: `${header}\nNo one played today's daily!`, mentions: [] };
    }

    const streakLine = `\n\n Total group streak: 🔥 ${getGroupDailyStreak(participants, recapDate)}`;
    return { text: `${header}\n\n${lines.join('\n')}${streakLine}`, mentions };
}
