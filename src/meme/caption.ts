import sharp from 'sharp';

export async function addCaption(imageBuffer: Buffer, text: string): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 512;
    const height = metadata.height || 512;

    const fontSize = Math.max(Math.floor(width / 14), 20);

    const margin = Math.floor(width * 0.05);

    const textImg = await sharp({
        text: {
            text: `<span foreground="black">${escPango(text)}</span>`,
            font: 'Futura Condensed ExtraBold',
            width: width - margin * 2,
            align: 'centre',
            rgba: true,
            dpi: Math.floor(fontSize * 7.2),
        },
    })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png()
        .toBuffer();

    const textMeta = await sharp(textImg).metadata();
    const textHeight = textMeta.height || fontSize;

    const padding = Math.floor(fontSize * 0.3);
    const barHeight2 = textHeight + padding * 2;

    const captionBar = await sharp({
        create: {
            width,
            height: barHeight2,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
    })
        .composite([{ input: textImg, top: padding, left: margin }])
        .png()
        .toBuffer();

    const resizedImage = await sharp(imageBuffer).resize(width, height).png().toBuffer();

    return sharp({
        create: {
            width,
            height: height + barHeight2,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
    })
        .composite([
            { input: captionBar, top: 0, left: 0 },
            { input: resizedImage, top: barHeight2, left: 0 },
        ])
        .jpeg({ quality: 90 })
        .toBuffer();
}

function escPango(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
