import { client } from '../clientConfig';
import { safeReply } from '../infra/safeReply';
import { log } from '../infra/logger';
import {
    getUserInfo, getTopAlbums, getTopTracks, getTopArtists, getRecentTracks,
    parsePeriod, periodDisplay,
} from './lastfm';
import { generateChart } from './chart';
import { getUsername, setUsername, removeUsername } from './users';

const { MessageMedia } = require('whatsapp-web.js');

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type FmCommandMap = Record<string, Handler>;

function requireUsername(msg: Msg): string | null {
    return getUsername(msg.senderId) ?? null;
}

function parseSize(input: string): { cols: number; rows: number } | null {
    const match = input.match(/^(\d{1,2})x(\d{1,2})$/);
    if (!match) return null;
    const cols = Math.min(Math.max(parseInt(match[1]), 1), 10);
    const rows = Math.min(Math.max(parseInt(match[2]), 1), 10);
    return { cols, rows };
}

export const fmCommands: FmCommandMap = {

    'set': async (msg, _chatId, args) => {
        const username = args.trim();
        if (!username) {
            await safeReply(client, msg, 'Usage: !fm set <lastfm username>');
            return;
        }

        try {
            const user = await getUserInfo(username);
            setUsername(msg.senderId, user.name);
            await safeReply(client, msg, `Linked to Last.fm account *${user.name}*`);
            log('fm set', `${msg.senderId} -> ${user.name}`);
        } catch {
            await safeReply(client, msg, `Last.fm user "${username}" not found.`);
        }
    },

    'unset': async (msg) => {
        removeUsername(msg.senderId);
        await safeReply(client, msg, 'Last.fm account unlinked.');
        log('fm unset', msg.senderId);
    },

    'np': async (msg) => {
        const username = requireUsername(msg);
        if (!username) { await safeReply(client, msg, 'Link your account first: !fm set <username>'); return; }

        try {
            const tracks = await getRecentTracks(username, 1);
            if (!tracks.length) { await safeReply(client, msg, 'No recent tracks.'); return; }

            const t = tracks[0];
            const nowPlaying = t['@attr']?.nowplaying === 'true';
            const prefix = nowPlaying ? 'Now playing' : 'Last played';
            await safeReply(client, msg, `*${prefix}:* ${t.artist['#text']} — ${t.name}\nAlbum: ${t.album['#text'] || '-'}`);
        } catch {
            await safeReply(client, msg, 'Failed to fetch recent tracks.');
        }
    },

    'toptracks': async (msg, _chatId, args) => {
        const username = requireUsername(msg);
        if (!username) { await safeReply(client, msg, 'Link your account first: !fm set <username>'); return; }

        const period = parsePeriod(args.trim() || undefined);
        try {
            const tracks = await getTopTracks(username, period, 10);
            if (!tracks.length) { await safeReply(client, msg, 'No tracks found for this period.'); return; }

            const header = `*Top Tracks (${periodDisplay(period)}) — ${username}*`;
            const lines = tracks.map((t, i) => `${i + 1}. ${t.artist.name} — ${t.name} (${t.playcount})`);
            await safeReply(client, msg, `${header}\n${lines.join('\n')}`);
        } catch {
            await safeReply(client, msg, 'Failed to fetch top tracks.');
        }
    },

    'topartists': async (msg, _chatId, args) => {
        const username = requireUsername(msg);
        if (!username) { await safeReply(client, msg, 'Link your account first: !fm set <username>'); return; }

        const period = parsePeriod(args.trim() || undefined);
        try {
            const artists = await getTopArtists(username, period, 10);
            if (!artists.length) { await safeReply(client, msg, 'No artists found for this period.'); return; }

            const header = `*Top Artists (${periodDisplay(period)}) — ${username}*`;
            const lines = artists.map((a, i) => `${i + 1}. ${a.name} (${a.playcount})`);
            await safeReply(client, msg, `${header}\n${lines.join('\n')}`);
        } catch {
            await safeReply(client, msg, 'Failed to fetch top artists.');
        }
    },

    'profile': async (msg) => {
        const username = requireUsername(msg);
        if (!username) { await safeReply(client, msg, 'Link your account first: !fm set <username>'); return; }

        try {
            const user = await getUserInfo(username);
            const lines = [
                `*${user.name}*`,
                `Scrobbles: ${Number(user.playcount).toLocaleString()}`,
                `Country: ${user.country || '-'}`,
                `Registered: ${new Date(Number(user.registered?.unixtime) * 1000).toLocaleDateString('en-GB')}`,
            ];
            await safeReply(client, msg, lines.join('\n'));
        } catch {
            await safeReply(client, msg, 'Failed to fetch profile.');
        }
    },

    'chart': async (msg, _chatId, args) => {
        const username = requireUsername(msg);
        if (!username) { await safeReply(client, msg, 'Link your account first: !fm set <username>'); return; }

        const parts = args.trim().split(/\s+/).filter(Boolean);
        let cols = 3, rows = 3;
        let periodInput: string | undefined;

        for (const part of parts) {
            const size = parseSize(part);
            if (size) { cols = size.cols; rows = size.rows; }
            else { periodInput = part; }
        }

        const period = parsePeriod(periodInput);
        const limit = cols * rows;

        await safeReply(client, msg, 'Generating chart...');

        try {
            const albums = await getTopAlbums(username, period, limit);
            if (!albums.length) {
                await safeReply(client, msg, 'No albums found for this period.');
                return;
            }

            const buffer = await generateChart(albums, cols, rows);
            const media = new MessageMedia('image/jpeg', buffer.toString('base64'), 'chart.jpg');
            await safeReply(client, msg, media);
            log('fm chart', `${cols}x${rows} ${period} sent to ${msg.senderId}`);
        } catch (err: any) {
            log('fm chart error', err.message);
            await safeReply(client, msg, 'Failed to generate chart.');
        }
    },

};
