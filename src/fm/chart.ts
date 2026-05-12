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

export async function generateChart(albums: TopAlbum[], cols = 3, rows = 3): Promise<Buffer> {
    const total = cols * rows;
    const tiles: Buffer[] = [];

    for (const album of albums.slice(0, total)) {
        const url = getAlbumArtUrl(album);
        if (url) {
            try {
                const img = await fetchImage(url);
                tiles.push(await sharp(img).resize(TILE_SIZE, TILE_SIZE).jpeg().toBuffer());
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
