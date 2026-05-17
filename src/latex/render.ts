import axios from 'axios';
import sharp from 'sharp';

const BG_SVG = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <radialGradient id="g" cx="0%" cy="0%" r="100%">
            <stop offset="0%" stop-color="#f472b6" stop-opacity="0.7"/>
            <stop offset="50%" stop-color="#f9a8d4" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
    </defs>
    <rect width="512" height="512" fill="white"/>
    <rect width="512" height="512" fill="url(#g)"/>
</svg>`;

export async function renderLatex(latex: string): Promise<Buffer> {
    const url = `https://latex.codecogs.com/png.image?\\dpi{1200}${encodeURIComponent(latex)}`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });

    const bg = await sharp(Buffer.from(BG_SVG)).png().toBuffer();

    const latexImg = await sharp(Buffer.from(res.data))
        .resize(440, 440, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

    return sharp(bg)
        .composite([{ input: latexImg, top: 36, left: 36 }])
        .webp()
        .toBuffer();
}
