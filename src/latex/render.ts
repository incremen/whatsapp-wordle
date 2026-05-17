import axios from 'axios';
import sharp from 'sharp';

export async function renderLatex(latex: string): Promise<Buffer> {
    const url = `https://latex.codecogs.com/png.image?\\dpi{600}\\bg{white}${encodeURIComponent(latex)}`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
    return sharp(Buffer.from(res.data))
        .resize(440, 440, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .extend({ top: 36, bottom: 36, left: 36, right: 36, background: { r: 255, g: 255, b: 255 } })
        .webp()
        .toBuffer();
}
