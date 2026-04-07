import Database from 'better-sqlite3';
import * as path from 'path';

const db = new Database(path.join(__dirname, '..', 'data', 'wordle.db'));

export function initDb(): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS games (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id    TEXT    NOT NULL,
            started_by TEXT    NOT NULL,
            target     TEXT    NOT NULL,
            daily_date TEXT,
            started_at INTEGER NOT NULL,
            ended_at   INTEGER,
            won        INTEGER
        );

        CREATE TABLE IF NOT EXISTS moves (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL REFERENCES games(id),
            seq     INTEGER NOT NULL,
            user_id TEXT    NOT NULL,
            type    TEXT    NOT NULL CHECK(type IN ('guess', 'hint')),
            value   TEXT    NOT NULL,
            result  TEXT    NOT NULL
        );
    `);
}

type GameData = {
    startedBy: string;
    target: string;
    won: boolean;
    startedAt: number;
    moves: { type: 'guess' | 'hint'; userId: string; value: string; result: string }[];
};

export function saveGame(chatId: string, data: GameData): void {
    const insertGame = db.prepare(
        `INSERT INTO games (chat_id, started_by, target, started_at, ended_at, won) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertMove = db.prepare(
        `INSERT INTO moves (game_id, seq, user_id, type, value, result) VALUES (?, ?, ?, ?, ?, ?)`
    );

    db.transaction(() => {
        const { lastInsertRowid: gameId } = insertGame.run(chatId, data.startedBy, data.target, data.startedAt, Date.now(), data.won ? 1 : 0);
        for (let i = 0; i < data.moves.length; i++) {
            const { type, userId, value, result } = data.moves[i];
            insertMove.run(gameId, i, userId, type, value, result);
        }
    })();
}

export function getRecentGames(count = 5): string {
    const games = db.prepare(
        `SELECT * FROM games ORDER BY id DESC LIMIT ?`
    ).all(count) as any[];

    if (!games.length) return 'No games yet.';

    const getMoves = db.prepare(`SELECT * FROM moves WHERE game_id = ? ORDER BY seq`);
    const fmt = (ts: number) => new Date(ts).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

    return games.reverse().map(g => {
        const moves = getMoves.all(g.id) as any[];
        const moveLines = moves.map(m => `${m.value}: ${m.result}`).join('\n');
        const lines = [
            `Game #${g.id}`,
            `Chat:       ${g.chat_id}`,
            `Started by: ${g.started_by}`,
            `Target:     ${g.target}`,
            `Won:        ${g.won ? 'Yes' : 'No'}`,
            `Time:       ${fmt(g.started_at)} → ${fmt(g.ended_at)}`,
            `Moves:`,
            `\`\`\`${moveLines}\`\`\``,
        ];
        return lines.join('\n');
    }).join('\n\n');
}

export function getUserStats(userId: string): string {
    const row = db.prepare(`
        SELECT
            COUNT(*)          AS total,
            SUM(won)          AS wins,
            AVG(CASE WHEN won = 1 THEN (SELECT COUNT(*) FROM moves WHERE game_id = g.id AND type = 'guess') END) AS avg_guesses,
            AVG(CASE WHEN won = 1 THEN (SELECT COUNT(*) FROM moves WHERE game_id = g.id AND type = 'hint') END)  AS avg_hints
        FROM games g
        WHERE started_by = ?
    `).get(userId) as any;

    if (!row || row.total === 0) return 'No games found for this user.';

    const winRate = ((row.wins / row.total) * 100).toFixed(0);
    const lines = [
        `Games:       ${row.total}`,
        `Wins:        ${row.wins}/${row.total} (${winRate}%)`,
        `Avg guesses: ${row.avg_guesses?.toFixed(1) ?? '-'}`,
        `Avg hints:   ${row.avg_hints?.toFixed(1) ?? '0'}`,
    ];
    return lines.join('\n');
}

export function getDailyStreak(userId: string): number {
    const dates = db.prepare(
        `SELECT daily_date FROM games WHERE started_by = ? AND daily_date IS NOT NULL AND won = 1 ORDER BY daily_date DESC`
    ).all(userId) as { daily_date: string }[];

    if (!dates.length) return 0;

    let streak = 0;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

    // start from today or yesterday
    let expected = today;
    if (dates[0].daily_date !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expected = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
    }

    for (const { daily_date } of dates) {
        if (daily_date === expected) {
            streak++;
            const prev = new Date(expected + 'T00:00:00');
            prev.setDate(prev.getDate() - 1);
            expected = prev.toISOString().slice(0, 10);
        } else {
            break;
        }
    }

    return streak;
}