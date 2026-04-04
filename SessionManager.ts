import { Session } from './Session';

export class SessionManager {
    private sessions = new Map<string, Session>();

    getOrCreate(userId: string): Session {
        if (!this.sessions.has(userId) || this.sessions.get(userId)!.done) {
            this.sessions.set(userId, new Session());
        }
        return this.sessions.get(userId)!;
    }
}
