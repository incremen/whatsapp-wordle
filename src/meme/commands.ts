import { client } from '../clientConfig';
import { safeReply } from '../infra/safeReply';
import { log } from '../infra/logger';
import { addCaption } from './caption';

const { MessageMedia } = require('whatsapp-web.js');

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type MemeCommandMap = Record<string, Handler>;

export const memeCommands: MemeCommandMap = {

    '!caption': async (msg, _chatId, args) => {
        const text = args.trim();
        if (!text) { await safeReply(client, msg, 'Usage: send or reply to an image with `!caption <text>`'); return; }

        try {
            let media;

            // Priority 1: image attached to this message
            if (msg.hasMedia) {
                media = await msg.downloadMedia();
            }

            // Priority 2: quoted message image
            if (!media && msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                    media = await quotedMsg.downloadMedia();
                }
            }

            if (!media || !media.mimetype.startsWith('image/')) {
                await safeReply(client, msg, 'Send or reply to an image with `!caption <text>`');
                return;
            }

            const imageBuffer = Buffer.from(media.data, 'base64');
            const result = await addCaption(imageBuffer, text);
            const resultMedia = new MessageMedia('image/jpeg', result.toString('base64'), 'caption.jpg');
            await safeReply(client, msg, resultMedia);
        } catch (err: any) {
            log('caption error', err.message);
            await safeReply(client, msg, 'Failed to add caption.');
        }
    },

};
