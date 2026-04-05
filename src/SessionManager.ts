import { Session } from './Session';

export class SessionManager {
    private sessions = new Map<string, Session>();

    get(userId: string): Session | undefined {
        return this.sessions.get(userId);
    }

    create(userId: string): Session {
        const session = new Session();
        this.sessions.set(userId, session);
        return session;
    }

}
