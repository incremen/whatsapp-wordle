import cron from 'node-cron';
import { getDailyBoardChats } from '../infra/dailyBoard';
import { getUserDailyResult } from '../infra/db';
import { todayDate } from '../infra/time';
import { log } from '../infra/logger';

let scheduled = false;

export function startDailyBoardScheduler(client: any) {
    if (scheduled) { log('Daily board scheduler already running, skipping'); return; }
    scheduled = true;

    cron.schedule('1 19 * * *', async () => {
        log('Daily board cron fired');
        await sendDailyBoards(client);
    }, { timezone: 'Asia/Jerusalem' });

    log('Daily board scheduler started (cron: midnight IST)');
}

async function sendDailyBoards(client: any) {
    for (const chatId of getDailyBoardChats()) {
        await sendDailyBoardToChat(client, chatId);
    }
}

async function sendDailyBoardToChat(client: any, chatId: string) {
    const chat = await client.getChatById(chatId);
    const participants = chat.participants?.map((p: any) => p.id._serialized) ?? [];

    const lines: string[] = [];
    const mentions: string[] = [];
    let bestStreak = 0;

    for (const userId of participants) {
        const result = getUserDailyResult(userId);
        if (!result) continue;

        const status = result.won ? `✅ ${result.guesses}/6` : '❌';
        lines.push(`@${userId.replace('@c.us', '')}: ${status} (🔥 ${result.streak})`);
        mentions.push(userId);
        if (result.streak > bestStreak) bestStreak = result.streak;
    }

    if (!lines.length) {
        await chat.sendMessage(`📊 *Daily Wordle Recap — ${todayDate()}*\nNo one played today's daily!`);
        return;
    }

    const header = `📊 *Daily Wordle Recap — ${todayDate()}*`;
    const streakLine = `\nGroup streak: 🔥 ${bestStreak}`;
    await chat.sendMessage(`${header}\n\n${lines.join('\n')}${streakLine}`, { mentions });
}
