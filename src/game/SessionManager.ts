import { Session, GameType } from './Session';

export class SessionManager {
    private sessions = new Map<string, Session>();

    get(chatId: string): Session | undefined {
        return this.sessions.get(chatId);
    }

    create(chatId: string, startedBy: string, gameType: GameType = 'regular', target?: string): Session {
        const session = new Session(startedBy, gameType, target);
        this.sessions.set(chatId, session);
        return session;
    }
}
