import { client } from '../clientConfig';
import { safeReply } from '../infra/safeReply';
import { log } from '../infra/logger';
import { renderLatex } from './render';

const { MessageMedia } = require('whatsapp-web.js');

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type LatexCommandMap = Record<string, Handler>;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function sendSticker(msg: any, media: any, name: string) {
    const opts = { sendMediaAsSticker: true, stickerName: name };

    for (let i = 0; i < 3; i++) {
        try {
            await msg.reply(media, undefined, opts);
            return;
        } catch (err: any) {
            log('latex retry', `attempt ${i + 1} failed: ${err.message}`);
            if (i < 2) { await delay(1500); continue; }

            if (err.message?.includes('unsafe')) {
                log('latex', 'poll bug — falling back to direct send');
                await client.sendMessage(msg.id.remote, media, opts);
            } else {
                throw err;
            }
        }
    }
}

export const latexCommands: LatexCommandMap = {

    '!l': async (msg, _chatId, args) => {
        if (!args.trim()) { await safeReply(client, msg, 'Usage: `!l <latex expression>`'); return; }
        try {
            const buffer = await renderLatex(args.trim());
            const media = new MessageMedia('image/webp', buffer.toString('base64'), 'latex.webp');
            await sendSticker(msg, media, args.trim());
        } catch (err: any) {
            log('latex error', err.message);
            await safeReply(client, msg, `Failed to render LaTeX: ${err.message}`);
        }
    },

};
