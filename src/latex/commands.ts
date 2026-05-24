import { client } from '../clientConfig';
import { safeReply } from '../infra/safeReply';
import { log } from '../infra/logger';
import { renderLatex } from './render';

const { MessageMedia } = require('whatsapp-web.js');

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type LatexCommandMap = Record<string, Handler>;

export const latexCommands: LatexCommandMap = {

    '!l': async (msg, _chatId, args) => {
        if (!args.trim()) { await safeReply(client, msg, 'Usage: `!l <latex expression>`'); return; }
        try {
            const buffer = await renderLatex(args.trim());
            const media = new MessageMedia('image/webp', buffer.toString('base64'), 'latex.webp');
            await msg.reply(media, undefined, { sendMediaAsSticker: true, stickerName: args.trim() });
        } catch (err: any) {
            log('latex error', err.message);
            await safeReply(client, msg, 'Failed to render LaTeX.');
        }
    },

};
