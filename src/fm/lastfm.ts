import axios from 'axios';

const BASE = 'https://ws.audioscrobbler.com/2.0/';

function call(method: string, params: Record<string, string>) {
    return axios.get(BASE, {
        params: { method, api_key: process.env.LASTFM_API_KEY, format: 'json', ...params },
    }).then(res => res.data);
}

// Periods accepted by the Last.fm API
export const PERIODS: Record<string, string> = {
    '7day': '7day', 'week': '7day', 'weekly': '7day',
    '1month': '1month', 'month': '1month', 'monthly': '1month',
    '3month': '3month', 'quarter': '3month', 'quarterly': '3month',
    '6month': '6month', 'half': '6month',
    '12month': '12month', 'year': '12month', 'yearly': '12month',
    'overall': 'overall', 'alltime': 'overall', 'all': 'overall',
};

export function parsePeriod(input?: string): string {
    if (!input) return '7day';
    return PERIODS[input.toLowerCase()] ?? '7day';
}

export function periodDisplay(period: string): string {
    const map: Record<string, string> = {
        '7day': 'Weekly', '1month': 'Monthly', '3month': 'Quarterly',
        '6month': '6 Months', '12month': 'Yearly', 'overall': 'All Time',
    };
    return map[period] ?? period;
}

// API methods

export async function getUserInfo(username: string) {
    const data = await call('user.getinfo', { user: username });
    return data.user;
}

export interface TopAlbum {
    name: string;
    artist: { name: string };
    playcount: string;
    image: { '#text': string; size: string }[];
}

export interface TopTrack {
    name: string;
    artist: { name: string };
    playcount: string;
}

export interface TopArtist {
    name: string;
    playcount: string;
}

export interface RecentTrack {
    name: string;
    artist: { '#text': string };
    album: { '#text': string };
    '@attr'?: { nowplaying: string };
}

export async function getTopAlbums(username: string, period = '7day', limit = 9): Promise<TopAlbum[]> {
    const data = await call('user.gettopalbums', { user: username, period, limit: String(limit) });
    return data.topalbums?.album || [];
}

export async function getTopTracks(username: string, period = '7day', limit = 10): Promise<TopTrack[]> {
    const data = await call('user.gettoptracks', { user: username, period, limit: String(limit) });
    return data.toptracks?.track || [];
}

export async function getTopArtists(username: string, period = '7day', limit = 10): Promise<TopArtist[]> {
    const data = await call('user.gettopartists', { user: username, period, limit: String(limit) });
    return data.topartists?.artist || [];
}

export async function getRecentTracks(username: string, limit = 1): Promise<RecentTrack[]> {
    const data = await call('user.getrecenttracks', { user: username, limit: String(limit) });
    return data.recenttracks?.track || [];
}
