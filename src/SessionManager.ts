import { Session } from './Session';

export class SessionManager {
    private sessions = new Map<string, Session>();

    get(userId: string): Session | undefined {
        return this.sessions.get(userId);
    }

    create(chatId: string, startedBy: string, target?: string): Session {
        const session = new Session(startedBy, target);
        this.sessions.set(chatId, session);
        return session;
    }

}
