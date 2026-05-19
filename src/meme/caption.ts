import sharp from 'sharp';

export async function addCaption(imageBuffer: Buffer, text: string): Promise<Buffer> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 512;
    const height = metadata.height || 512;

    const fontSize = Math.max(Math.floor(width / 12.7), 22);
    const padding = Math.floor(fontSize * 0.1);
    const lineHeight = fontSize * 1.1;
    const charWidth = fontSize * 0.48;

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length * charWidth > width - padding * 2 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    const barHeight = Math.floor(lines.length * lineHeight + padding * 2 + fontSize * 0.2);

    const textSvg = `<svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${lines.map((line, i) =>
            `<text x="50%" y="${padding + (i + 0.85) * lineHeight}" text-anchor="middle" font-family="Futura, Impact, Arial Black, sans-serif" font-weight="900" font-stretch="condensed" font-size="${fontSize}" fill="black">${escXml(line)}</text>`
        ).join('\n')}
    </svg>`;

    const captionBar = await sharp(Buffer.from(textSvg)).png().toBuffer();
    const resizedImage = await sharp(imageBuffer).resize(width, height).png().toBuffer();

    return sharp({
        create: {
            width,
            height: height + barHeight,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
    })
        .composite([
            { input: captionBar, top: 0, left: 0 },
            { input: resizedImage, top: barHeight, left: 0 },
        ])
        .jpeg({ quality: 90 })
        .toBuffer();
}

function escXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
