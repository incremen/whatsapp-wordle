import { client } from '../clientConfig';
import { safeReply } from '../infra/safeReply';
import { log } from '../infra/logger';
import { addCaption } from './caption';

const { MessageMedia } = require('whatsapp-web.js');

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type MemeCommandMap = Record<string, Handler>;

async function getMedia(msg: Msg): Promise<any | null> {
    if (msg.hasMedia) return msg.downloadMedia();
    if (msg.hasQuotedMsg) {
        const quoted = await msg.getQuotedMessage();
        if (quoted.hasMedia) return quoted.downloadMedia();
    }
    return null;
}

export const memeCommands: MemeCommandMap = {

    '!sticker': async (msg) => {
        const media = await getMedia(msg);
        if (!media || !media.mimetype.startsWith('image/')) {
            await safeReply(client, msg, 'Send or reply to an image with `!sticker`');
            return;
        }
        const chat = await msg.getChat();
        await chat.sendMessage(media, { sendMediaAsSticker: true });
    },

    '!unsticker': async (msg) => {
        const media = await getMedia(msg);
        if (!media) { await safeReply(client, msg, 'Reply to a sticker with `!unsticker`'); return; }
        const imageMedia = new MessageMedia('image/webp', media.data, 'image.webp');
        await safeReply(client, msg, imageMedia);
    },

    '!caption': async (msg, _chatId, args) => {
        const text = args.trim();
        if (!text) { await safeReply(client, msg, 'Usage: send or reply to an image with `!caption <text>`'); return; }

        try {
            const media = await getMedia(msg);
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
