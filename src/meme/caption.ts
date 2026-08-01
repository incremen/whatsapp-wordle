import sharp from 'sharp';
import path from 'path';

const SPEECH_BUBBLE_PATH = path.join(__dirname, 'assets', 'speech_bubble.png');
const BUBBLE_ASPECT = 910 / 131; // native width:height of tail PNG

export async function addSpeechBubble(imageBuffer: Buffer, text: string): Promise<Buffer> {
    const sanitized = text.replaceAll('\n', ' ').slice(0, 500);

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 512;
    const height = metadata.height || 512;

    const fontSize = Math.max(Math.floor(width / 14), 20);
    const margin = Math.floor(width * 0.05);

    const textImg = await sharp({
        text: {
            text: `<span foreground="black">${escPango(sanitized)}</span>`,
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
    const textWidth = textMeta.width || width;
    const padding = Math.floor(fontSize * 0.3);
    const textBarHeight = textHeight + padding * 2;
    const leftOffset = Math.floor((width - textWidth) / 2);

    const tailHeight = Math.round(width / BUBBLE_ASPECT);
    const tail = await sharp(SPEECH_BUBBLE_PATH)
        .resize(width, tailHeight, { fit: 'fill' })
        .png()
        .toBuffer();

    const captionBar = await sharp({
        create: { width, height: textBarHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
        .composite([{ input: textImg, top: padding, left: leftOffset }])
        .png()
        .toBuffer();

    const resizedImage = await sharp(imageBuffer).resize(width, height).png().toBuffer();

    // Overlay the bubble tail onto the top of the image
    const imageWithBubble = await sharp(resizedImage)
        .composite([{ input: tail, top: 0, left: 0 }])
        .png()
        .toBuffer();

    return sharp({
        create: { width, height: height + textBarHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
        .composite([
            { input: captionBar, top: 0, left: 0 },
            { input: imageWithBubble, top: textBarHeight, left: 0 },
        ])
        .jpeg({ quality: 90 })
        .toBuffer();
}

export async function addCaption(imageBuffer: Buffer, text: string): Promise<Buffer> {
    // my friends manages to crash the bot by giving it a caption with 1000 newlines. lets not let that happen anymore :)
    const sanitized = text.replaceAll('\n', ' ').slice(0, 500);

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 512;
    const height = metadata.height || 512;

    const fontSize = Math.max(Math.floor(width / 14), 20);

    const margin = Math.floor(width * 0.05);

    const textImg = await sharp({
        text: {
            text: `<span foreground="black">${escPango(sanitized)}</span>`,
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
    const textWidth = textMeta.width || width;
    const textHeight = textMeta.height || fontSize;

    const padding = Math.floor(fontSize * 0.3);
    const barHeight2 = textHeight + padding * 2;
    const leftOffset = Math.floor((width - textWidth) / 2);

    const captionBar = await sharp({
        create: {
            width,
            height: barHeight2,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
    })
        .composite([{ input: textImg, top: padding, left: leftOffset }])
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
