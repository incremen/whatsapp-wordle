const { Client, LocalAuth } = require('whatsapp-web.js');

const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
];

// Update this path if Chrome/Chromium is installed elsewhere on your system
const executablePath =
    process.platform === 'linux' ? '/snap/bin/chromium' : undefined;

export const puppeteerConfig: any = executablePath
    ? { executablePath, args: PUPPETEER_ARGS, protocolTimeout: 120_000 }
    : { args: PUPPETEER_ARGS, protocolTimeout: 120_000 };

export const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerConfig,
    webVersion: '2.3000.1014054010',
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1014054010.html'
    }
});