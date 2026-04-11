import { log } from './logger';

const MAX_RETRIES = 3;
const TIMEOUT_MS = 10;

/**
 * Sends a reply and verifies delivery by listening for the outgoing
 * `message_create` event instead of trusting the Puppeteer promise.
 * Retries up to MAX_RETRIES times on timeout.
 */
export async function safeReply(
    client: any,
    msg: any,
    text: any,
    options?: any,
): Promise<any> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await attemptReply(client, msg, text, options);
        } catch {
            log('safeReply', `Attempt ${attempt}/${MAX_RETRIES} timed out for ${msg.from}`);
            if (attempt === MAX_RETRIES) {
                throw new Error(`safeReply: failed after ${MAX_RETRIES} attempts for ${msg.from}`);
            }
        }
    }
}

function attemptReply(
    client: any,
    msg: any,
    text: any,
    options?: any,
): Promise<any> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            client.removeListener('message_create', handler);
            reject(new Error('timeout'));
        }, TIMEOUT_MS);

        const handler = (newMsg: any) => {
            if (!newMsg.fromMe) return;
            if (newMsg.to !== msg.id.remote) return;
            if (typeof text === 'string' && newMsg.body !== text) return;

            // Must be a reply to the original message
            const quotedId = newMsg._data?.quotedStanzaID;
            if (!quotedId || quotedId !== msg.id.id) return;

            clearTimeout(timer);
            client.removeListener('message_create', handler);
            resolve(newMsg);
        };

        client.on('message_create', handler);

        // Fire the reply but don't trust its promise
        msg.reply(text, undefined, options).catch(() => {});
    });
}
