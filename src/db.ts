import Database from 'better-sqlite3';
import * as path from 'path';

const db = new Database(path.join(__dirname, '..', 'data', 'wordle.db'));

export function initDb(): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS games (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id    TEXT    NOT NULL,
            target     TEXT    NOT NULL,
            started_at INTEGER NOT NULL,
            ended_at   INTEGER,
            won        INTEGER
        );

        CREATE TABLE IF NOT EXISTS moves (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL REFERENCES games(id),
            seq     INTEGER NOT NULL,
            type    TEXT    NOT NULL CHECK(type IN ('guess', 'hint')),
            value   TEXT    NOT NULL,
            result  TEXT    NOT NULL
        );
    `);
}

type GameData = {
    target: string;
    won: boolean;
    startedAt: number;
    moves: { type: 'guess' | 'hint'; value: string; result: string }[];
};

export function saveGame(chatId: string, data: GameData): void {
    const insertGame = db.prepare(
        `INSERT INTO games (chat_id, target, started_at, ended_at, won) VALUES (?, ?, ?, ?, ?)`
    );
    const insertMove = db.prepare(
        `INSERT INTO moves (game_id, seq, type, value, result) VALUES (?, ?, ?, ?, ?)`
    );

    db.transaction(() => {
        const { lastInsertRowid: gameId } = insertGame.run(chatId, data.target, data.startedAt, Date.now(), data.won ? 1 : 0);
        for (let i = 0; i < data.moves.length; i++) {
            const { type, value, result } = data.moves[i];
            insertMove.run(gameId, i, type, value, result);
        }
    })();
}
