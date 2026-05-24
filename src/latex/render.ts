import axios from 'axios';
import sharp from 'sharp';

const COLORS = [
    ['#f472b6', '#f9a8d4'], // pink
    ['#60a5fa', '#93c5fd'], // blue
    ['#a78bfa', '#c4b5fd'], // purple
    ['#34d399', '#6ee7b7'], // green
    ['#fbbf24', '#fde68a'], // amber
    ['#f87171', '#fca5a5'], // red
    ['#22d3ee', '#67e8f9'], // cyan
    ['#fb923c', '#fdba74'], // orange
];

const CORNERS = [
    ['0%', '0%'],   // top-left
    ['100%', '0%'], // top-right
    ['0%', '100%'], // bottom-left
    ['100%', '100%'], // bottom-right
];

function makeBgSvg(): string {
    const [c1, c2] = COLORS[Math.floor(Math.random() * COLORS.length)];
    const [cx, cy] = CORNERS[Math.floor(Math.random() * CORNERS.length)];
    return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <radialGradient id="g" cx="${cx}" cy="${cy}" r="100%">
                <stop offset="0%" stop-color="${c1}" stop-opacity="0.7"/>
                <stop offset="50%" stop-color="${c2}" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
            </radialGradient>
        </defs>
        <rect width="512" height="512" fill="white"/>
        <rect width="512" height="512" fill="url(#g)"/>
    </svg>`;
}

export async function renderLatex(latex: string): Promise<Buffer> {
    const url = `https://latex.codecogs.com/png.image?\\dpi{1200}${encodeURIComponent(latex)}`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });

    const bg = await sharp(Buffer.from(makeBgSvg())).png().toBuffer();

    const latexImg = await sharp(Buffer.from(res.data))
        .resize(440, 440, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

    return sharp(bg)
        .composite([{ input: latexImg, top: 36, left: 36 }])
        .webp()
        .toBuffer();
}
