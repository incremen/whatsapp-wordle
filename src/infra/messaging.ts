// A message starting with "!" would re-trigger the bot's own command handler
// (fromMe messages are processed), causing a self-loop. All outgoing text is
// passed through this guard. Non-string payloads (media) pass through untouched.
export function sanitizeOutgoing(text: any): any {
    if (typeof text === 'string' && text.startsWith('!')) {
        return "Error: I can't reply with anything that starts with \"!\"";
    }
    return text;
}

// Wrapper around .sendMessage that always sanitizes the payload. `target` is
// anything with a .sendMessage method (a chat, or the client with a chatId arg).
// Use this instead of calling .sendMessage directly.
export async function sendMessage(target: any, ...args: any[]): Promise<any> {
    return target.sendMessage(...args.map(sanitizeOutgoing));
}

// Originally verified delivery via message_create event matching, but WhatsApp
// Web broke that in July 2026 (renamed internal key fields, switched to LID format).
export async function safeReply(
    _client: any,
    msg: any,
    text: any,
    options?: any,
): Promise<any> {
    text = sanitizeOutgoing(text);
    return msg.reply(text, undefined, { sendSeen: false, ...options });
}
