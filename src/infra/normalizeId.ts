// WhatsApp uses two ID formats for users:
//   - @c.us  (phone-based, e.g. "1234567890@c.us")
//   - @lid   (opaque, e.g. "9876543210@lid")
//
// Some users' DMs use @lid while group chat participants always use @c.us.
// If we save a game under @lid but query with @c.us, we get no match.
// This function normalizes msg.from to @c.us before any command runs,
// so the DB always stores phone-based IDs.

import { log } from './logger';

export async function normalizeUserId(msg: any): Promise<string> {
    // msg.author is the actual sender in group chats; msg.from is the group JID
    let senderId: string = msg.author || msg.from;
    if (!senderId) return '';

    // Strip device session suffix (e.g. "123456:2@c.us" -> "123456@c.us")
    if (senderId.includes(':')) {
        const [userPart, server] = senderId.split('@');
        senderId = `${userPart.split(':')[0]}@${server}`;
    }

    // Resolve @lid to @c.us via contact phone number
    if (senderId.endsWith('@lid')) {
        try {
            const contact = await msg.getContact();
            if (contact?.number) {
                const resolved = `${contact.number}@c.us`;
                log('Normalized ID', `${senderId} -> ${resolved}`);
                return resolved;
            }
        } catch {}
    }

    return senderId;
}
