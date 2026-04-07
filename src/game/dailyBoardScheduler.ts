import cron from 'node-cron';
import { getDailyBoardChats } from '../infra/dailyBoard';
import { getUserDailyResult, getGroupDailyStreak } from '../infra/db';
import { todayDate } from '../infra/time';
import { log } from '../infra/logger';

let scheduled = false;

export function startDailyBoardScheduler(client: any) {
    if (scheduled) { log('Daily board scheduler already running, skipping'); return; }
    scheduled = true;

    cron.schedule('26 19 * * *', async () => {
        log('Daily board cron fired');
        for (const chatId of getDailyBoardChats()) {
            const chat = await client.getChatById(chatId);
            const { text, mentions } = buildDailyRecap(chat.participants?.map((p: any) => p.id._serialized) ?? []);
            await chat.sendMessage(text, { mentions });
        }
    }, { timezone: 'Asia/Jerusalem' });

    log('Daily board scheduler started (cron: midnight IST)');
}

export function buildDailyRecap(participants: string[]): { text: string; mentions: string[] } {
    const lines: string[] = [];
    const mentions: string[] = [];

    for (const userId of participants) {
        const result = getUserDailyResult(userId);
        if (!result) continue;

        const status = result.won ? `✅ ${result.guesses}/6` : '❌';
        lines.push(`@${userId.replace('@c.us', '')}: ${status} (🔥 ${result.streak})`);
        mentions.push(userId);
    }

    const header = `📊 *Daily Wordle Recap — ${todayDate()}*`;

    if (!lines.length) {
        return { text: `${header}\nNo one played today's daily!`, mentions: [] };
    }

    const streakLine = `\nGroup streak: 🔥 ${getGroupDailyStreak(participants, todayDate())}`;
    return { text: `${header}\n\n${lines.join('\n')}${streakLine}`, mentions };
}
