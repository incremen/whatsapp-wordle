import { log } from './logger';

export async function normalizeUserId(msg: any): Promise<string> {
    let senderId: string = msg.from;
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
                return `${contact.number}@c.us`;
            }
        } catch {}
    }

    return senderId;
}
