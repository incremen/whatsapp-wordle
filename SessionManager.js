const { Session } = require('./Session');

class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    getOrCreate(userId) {
        if (!this.sessions.has(userId) || this.sessions.get(userId).done) {
            this.sessions.set(userId, new Session());
        }
        return this.sessions.get(userId);
    }
}

module.exports = { SessionManager };
