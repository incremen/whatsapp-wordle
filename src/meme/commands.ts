import { client } from '../clientConfig';
import { safeReply } from '../infra/messaging';
import { log } from '../infra/logger';
import { addCaption, addSpeechBubble } from './caption';

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

    // Flags (any order, before the text): img | sticker | bubble
    // e.g. !caption bubble hey, !caption sticker bubble hey, !caption img bubble hey
    '!caption': async (msg, _chatId, args) => {
        const FLAGS = ['img', 'sticker', 'bubble'] as const;
        let text = args.trim();
        let forceOutput: 'image' | 'sticker' | null = null;
        let bubble = false;

        let changed = true;
        while (changed) {
            changed = false;
            for (const flag of FLAGS) {
                if (text.startsWith(flag + ' ')) {
                    if (flag === 'img') forceOutput = 'image';
                    else if (flag === 'sticker') forceOutput = 'sticker';
                    else if (flag === 'bubble') bubble = true;
                    text = text.slice(flag.length + 1);
                    changed = true;
                }
            }
        }

        if (!text) { await safeReply(client, msg, 'Usage: `!caption [img|sticker] [bubble] <text>`'); return; }

        const media = await getMedia(msg);
        if (!media || !media.mimetype.startsWith('image/')) {
            await safeReply(client, msg, 'Send or reply to an image/sticker with `!caption <text>`');
            return;
        }

        const sourceIsSticker = isSticker(media);
        const outputAsSticker = forceOutput === 'sticker' || (forceOutput === null && sourceIsSticker);
        const imageBuffer = Buffer.from(media.data, 'base64');

        let result: Buffer;
        try {
            result = bubble
                ? await addSpeechBubble(imageBuffer, text)
                : await addCaption(imageBuffer, text);
        } catch (err: any) {
            log('caption error', err.message);
            await safeReply(client, msg, 'Failed to add caption.');
            return;
        }

        const resultMedia = new MessageMedia('image/jpeg', result.toString('base64'), 'caption.jpg');
        await safeReply(client, msg, resultMedia, outputAsSticker ? { sendMediaAsSticker: true } : undefined);
    },


};
