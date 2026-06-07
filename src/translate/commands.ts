import { client } from '../clientConfig';
import { safeReply } from '../infra/safeReply';
import { translateText } from './translate';

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type TranslateCommandMap = Record<string, Handler>;

export const translateCommands: TranslateCommandMap = {

    '!translate': async (msg, _chatId, args) => {
        const parts = args.trim().split(' ');
        const targetLang = parts[0];
        let text = parts.slice(1).join(' ');

        if (!targetLang) {
            await safeReply(client, msg, 'Usage: `!translate <language> <text>` or reply to a message with `!translate <language>`');
            return;
        }

        if (!text && msg.hasQuotedMsg) {
            const quoted = await msg.getQuotedMessage();
            text = quoted.body;
        }

        if (!text) {
            await safeReply(client, msg, 'Usage: `!translate <language> <text>` or reply to a message with `!translate <language>`');
            return;
        }

        try {
            const translated = await translateText(text, targetLang);
            await safeReply(client, msg, translated);
        } catch {
            await safeReply(client, msg, 'Translation failed.');
        }
    },

};
