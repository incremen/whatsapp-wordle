import axios from 'axios';
import sharp from 'sharp';

export async function renderLatex(latex: string): Promise<Buffer> {
    const url = `https://latex.codecogs.com/png.image?\\dpi{300}${encodeURIComponent(latex)}`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    return sharp(Buffer.from(res.data))
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .webp()
        .toBuffer();
}
