import { client } from '../clientConfig';
import { safeReply } from '../infra/safeReply';
import { addCaption } from './caption';

const { MessageMedia } = require('whatsapp-web.js');

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type MemeCommandMap = Record<string, Handler>;

export const memeCommands: MemeCommandMap = {

    '!caption': async (msg, _chatId, args) => {
        const text = args.trim();
        if (!text) { await safeReply(client, msg, 'Usage: reply to an image with `!caption <text>`'); return; }

        const quotedMsg = await msg.getQuotedMessage?.();
        if (!quotedMsg || !quotedMsg.hasMedia) {
            await safeReply(client, msg, 'Reply to an image with `!caption <text>`');
            return;
        }

        try {
            const media = await quotedMsg.downloadMedia();
            if (!media || !media.mimetype.startsWith('image/')) {
                await safeReply(client, msg, 'That doesn\'t look like an image.');
                return;
            }

            const imageBuffer = Buffer.from(media.data, 'base64');
            const result = await addCaption(imageBuffer, text);
            const resultMedia = new MessageMedia('image/jpeg', result.toString('base64'), 'caption.jpg');
            await safeReply(client, msg, resultMedia);
        } catch {
            await safeReply(client, msg, 'Failed to add caption.');
        }
    },

};
