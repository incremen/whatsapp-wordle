import { Session } from './Session';
import { getDailyWord, getTodayDate } from './daily';

export class DailySessionManager {
    private sessions = new Map<string, { date: string; session: Session }>();

    get(userId: string): Session | undefined {
        const entry = this.sessions.get(userId);
        if (!entry || entry.date !== getTodayDate()) return undefined;
        return entry.session;
    }

    create(userId: string): Session | null {
        const existing = this.get(userId);
        if (existing) return null;

        const word = getDailyWord();
        if (!word) return null;

        const session = new Session(userId, 'daily', word);
        this.sessions.set(userId, { date: getTodayDate(), session });
        return session;
    }
}
