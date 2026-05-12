import { client } from '../clientConfig';
import { safeReply } from '../infra/safeReply';
import { log } from '../infra/logger';
import { getUserInfo, getTopAlbums } from './lastfm';
import { generateChart } from './chart';
import { getUsername, setUsername, removeUsername } from './users';

const { MessageMedia } = require('whatsapp-web.js');

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type FmCommandMap = Record<string, Handler>;

export const fmCommands: FmCommandMap = {

    'set': async (msg, _chatId, args) => {
        const username = args.trim();
        if (!username) {
            await safeReply(client, msg, 'Usage: >fm set <lastfm username>');
            return;
        }

        try {
            const user = await getUserInfo(username);
            setUsername(msg.senderId, user.name);
            await safeReply(client, msg, `✓ Linked to Last.fm account *${user.name}*`);
            log('fm set', `${msg.senderId} -> ${user.name}`);
        } catch {
            await safeReply(client, msg, `❌ Last.fm user "${username}" not found.`);
        }
    },

    'unset': async (msg) => {
        removeUsername(msg.senderId);
        await safeReply(client, msg, '✓ Last.fm account unlinked.');
        log('fm unset', msg.senderId);
    },

    'chart': async (msg) => {
        const username = getUsername(msg.senderId);
        if (!username) {
            await safeReply(client, msg, 'Link your account first: >fm set <username>');
            return;
        }

        await safeReply(client, msg, 'Generating chart...');

        try {
            const albums = await getTopAlbums(username, '7day', 9);
            if (!albums.length) {
                await safeReply(client, msg, 'No albums found for the past week.');
                return;
            }

            const buffer = await generateChart(albums);
            const media = new MessageMedia('image/jpeg', buffer.toString('base64'), 'chart.jpg');

            const caption = albums
                .slice(0, 9)
                .map((a, i) => `${i + 1}. ${a.artist.name} - ${a.name} (${a.playcount})`)
                .join('\n');

            await safeReply(client, msg, media, { caption });
            log('fm chart', `sent to ${msg.senderId}`);
        } catch (err: any) {
            log('fm chart error', err.message);
            await safeReply(client, msg, '❌ Failed to generate chart.');
        }
    },

};
