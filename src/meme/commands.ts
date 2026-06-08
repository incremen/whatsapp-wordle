import { client } from '../clientConfig';
import { safeReply } from '../infra/messaging';
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

function isSticker(media: any): boolean {
    return media.mimetype === 'image/webp';
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

    // !caption <text>        — reply as same format (sticker→sticker, image→image)
    // !caption img <text>    — force output as image
    // !caption sticker <text> — force output as sticker
    '!caption': async (msg, _chatId, args) => {
        let text = args.trim();
        let forceOutput: 'image' | 'sticker' | null = null;

        if (text.startsWith('img ')) { forceOutput = 'image'; text = text.slice(4); }
        else if (text.startsWith('sticker ')) { forceOutput = 'sticker'; text = text.slice(8); }

        if (!text) { await safeReply(client, msg, 'Usage: `!caption [img|sticker] <text>`'); return; }

        try {
            const media = await getMedia(msg);
            if (!media || !media.mimetype.startsWith('image/')) {
                await safeReply(client, msg, 'Send or reply to an image/sticker with `!caption <text>`');
                return;
            }

            const sourceIsSticker = isSticker(media);
            const outputAsSticker = forceOutput === 'sticker' || (forceOutput === null && sourceIsSticker);

            const imageBuffer = Buffer.from(media.data, 'base64');
            const result = await addCaption(imageBuffer, text);

            if (outputAsSticker) {
                const stickerMedia = new MessageMedia('image/jpeg', result.toString('base64'), 'caption.jpg');
                await safeReply(client, msg, stickerMedia, { sendMediaAsSticker: true });
            } else {
                const resultMedia = new MessageMedia('image/jpeg', result.toString('base64'), 'caption.jpg');
                await safeReply(client, msg, resultMedia);
            }
        } catch (err: any) {
            log('caption error', err.message);
            await safeReply(client, msg, 'Failed to add caption.');
        }
    },

};
