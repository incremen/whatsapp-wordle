import Database from 'better-sqlite3';
import * as path from 'path';
import { log } from './logger';

const db = new Database(path.join(__dirname, '..', '..', 'data', 'wordle.db'));

export async function migrateLidIds(client: any): Promise<void> {
    // Find all @lid IDs across games and moves
    const lidIds = new Set<string>();
    const gameRows = db.prepare(`SELECT DISTINCT started_by FROM games WHERE started_by LIKE '%@lid'`).all() as { started_by: string }[];
    const chatRows = db.prepare(`SELECT DISTINCT chat_id FROM games WHERE chat_id LIKE '%@lid'`).all() as { chat_id: string }[];
    const moveRows = db.prepare(`SELECT DISTINCT user_id FROM moves WHERE user_id LIKE '%@lid'`).all() as { user_id: string }[];

    for (const r of gameRows) lidIds.add(r.started_by);
    for (const r of chatRows) lidIds.add(r.chat_id);
    for (const r of moveRows) lidIds.add(r.user_id);

    if (!lidIds.size) return;

    log('LID migration', `Found ${lidIds.size} @lid IDs to resolve`);

    // Resolve each @lid to @c.us via WhatsApp contact
    const mapping = new Map<string, string>();
    for (const lid of lidIds) {
        try {
            const contact = await client.getContactById(lid);
            if (contact?.number) {
                mapping.set(lid, `${contact.number}@c.us`);
                log('LID migration', `${lid} -> ${contact.number}@c.us`);
            } else {
                log('LID migration', `Could not resolve ${lid} (no number)`);
            }
        } catch (e) {
            log('LID migration', `Failed to resolve ${lid}: ${e}`);
        }
    }

    if (!mapping.size) { log('LID migration', 'No IDs resolved, skipping'); return; }

    // Apply updates
    const updateStartedBy = db.prepare(`UPDATE games SET started_by = ? WHERE started_by = ?`);
    const updateChatId = db.prepare(`UPDATE games SET chat_id = ? WHERE chat_id = ?`);
    const updateUserId = db.prepare(`UPDATE moves SET user_id = ? WHERE user_id = ?`);

    db.transaction(() => {
        for (const [lid, cus] of mapping) {
            updateStartedBy.run(cus, lid);
            updateChatId.run(cus, lid);
            updateUserId.run(cus, lid);
        }
    })();

    log('LID migration', `Updated ${mapping.size} IDs`);
}
