import { getDailyBoardChats } from '../infra/dailyBoard';
import { getUserDailyResult } from '../infra/db';
import { todayDate } from '../infra/time';
import { log } from '../infra/logger';

export function startDailyBoardScheduler(client: any) {
    const msUntilMidnight = () => {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return midnight.getTime() - now.getTime();
    };

    const schedule = () => {
        setTimeout(async () => {
            await sendDailyBoards(client);
            schedule();
        }, msUntilMidnight());
    };

    schedule();
    log('Daily board scheduler started');
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
    let bestStreak = 0;

    for (const userId of participants) {
        const result = getUserDailyResult(userId);
        if (!result) continue;

        const status = result.won ? `✅ ${result.guesses}/6` : '❌';
        lines.push(`${userId}: ${status} (🔥 ${result.streak})`);
        if (result.streak > bestStreak) bestStreak = result.streak;
    }

    if (!lines.length) {
        await chat.sendMessage(`📊 *Daily Wordle Recap — ${todayDate()}*\nNo one played today's daily!`);
        return;
    }

    const header = `📊 *Daily Wordle Recap — ${todayDate()}*`;
    const streakLine = `\nGroup streak: 🔥 ${bestStreak}`;
    await chat.sendMessage(`${header}\n\n${lines.join('\n')}${streakLine}`);
}
