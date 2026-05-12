import axios from 'axios';

const BASE = 'https://ws.audioscrobbler.com/2.0/';

function call(method: string, params: Record<string, string>) {
    return axios.get(BASE, {
        params: { method, api_key: process.env.LASTFM_API_KEY, format: 'json', ...params },
    }).then(res => res.data);
}

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

export async function getTopAlbums(
    username: string,
    period = '7day',
    limit = 9,
): Promise<TopAlbum[]> {
    const data = await call('user.gettopalbums', {
        user: username,
        period,
        limit: String(limit),
    });
    return data.topalbums?.album || [];
}
