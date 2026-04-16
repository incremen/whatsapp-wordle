import { SurvivalSession } from './SurvivalSession';

export class SurvivalManager {
    private sessions = new Map<string, SurvivalSession>();

    get(chatId: string): SurvivalSession | undefined {
        return this.sessions.get(chatId);
    }

    create(chatId: string, startedBy: string): SurvivalSession {
        const session = new SurvivalSession(startedBy);
        this.sessions.set(chatId, session);
        return session;
    }
}
