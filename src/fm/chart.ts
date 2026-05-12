import axios from 'axios';
import sharp from 'sharp';
import { TopAlbum } from './lastfm';

const TILE_SIZE = 300;

async function fetchImage(url: string): Promise<Buffer> {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    return Buffer.from(res.data);
}

function getAlbumArtUrl(album: TopAlbum): string | null {
    const img = album.image?.find((i) => i.size === 'extralarge') || album.image?.[album.image.length - 1];
    const url = img?.['#text'];
    if (!url || url.includes('2a96cbd8b46e442fc41c2b86b821562f')) return null;
    return url;
}

async function labelledTile(album: TopAlbum, imgBuf: Buffer): Promise<Buffer> {
    const label = `<svg width="${TILE_SIZE}" height="${TILE_SIZE}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="${TILE_SIZE - 50}" width="${TILE_SIZE}" height="50" fill="rgba(0,0,0,0.6)"/>
        <text x="5" y="${TILE_SIZE - 30}" fill="white" font-size="13" font-family="sans-serif">${escXml(album.name.slice(0, 30))}</text>
        <text x="5" y="${TILE_SIZE - 14}" fill="#ccc" font-size="11" font-family="sans-serif">${escXml(album.artist.name.slice(0, 28))}</text>
        <text x="${TILE_SIZE - 5}" y="${TILE_SIZE - 14}" fill="#ccc" font-size="11" font-family="sans-serif" text-anchor="end">${album.playcount}</text>
    </svg>`;
    return sharp(imgBuf)
        .resize(TILE_SIZE, TILE_SIZE)
        .composite([{ input: Buffer.from(label), top: 0, left: 0 }])
        .jpeg()
        .toBuffer();
}

export async function generateChart(albums: TopAlbum[], cols = 3, rows = 3): Promise<Buffer> {
    const total = cols * rows;
    const tiles: Buffer[] = [];

    for (const album of albums.slice(0, total)) {
        const url = getAlbumArtUrl(album);
        if (url) {
            try {
                const img = await fetchImage(url);
                tiles.push(await labelledTile(album, img));
            } catch {
                tiles.push(await placeholder(album));
            }
        } else {
            tiles.push(await placeholder(album));
        }
    }

    while (tiles.length < total) {
        tiles.push(await emptyTile());
    }

    const composites = tiles.map((buf, i) => ({
        input: buf,
        left: (i % cols) * TILE_SIZE,
        top: Math.floor(i / cols) * TILE_SIZE,
    }));

    return sharp({
        create: {
            width: cols * TILE_SIZE,
            height: rows * TILE_SIZE,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
        },
    })
        .composite(composites)
        .jpeg({ quality: 85 })
        .toBuffer();
}

async function placeholder(album: TopAlbum): Promise<Buffer> {
    const svg = `<svg width="${TILE_SIZE}" height="${TILE_SIZE}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a2e"/>
        <text x="50%" y="50%" text-anchor="middle" fill="white" font-size="14" font-family="sans-serif">
            <tspan x="50%" dy="-0.5em">${escXml(album.artist.name.slice(0, 30))}</tspan>
            <tspan x="50%" dy="1.2em">${escXml(album.name.slice(0, 30))}</tspan>
        </text>
    </svg>`;
    return sharp(Buffer.from(svg)).resize(TILE_SIZE, TILE_SIZE).jpeg().toBuffer();
}

async function emptyTile(): Promise<Buffer> {
    return sharp({ create: { width: TILE_SIZE, height: TILE_SIZE, channels: 3, background: { r: 26, g: 26, b: 46 } } })
        .jpeg()
        .toBuffer();
}

function escXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
