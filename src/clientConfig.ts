const { Client, LocalAuth } = require('whatsapp-web.js');

const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',

    // to not use so much memory in chrome with images:
    '--js-flags="--max-old-space-size=512"', 
    '--disable-application-cache',
    '--media-cache-size=1', 
    '--disk-cache-size=1',
];

// Update this path if Chrome/Chromium is installed elsewhere on your system
const executablePath = undefined;
    // process.platform === 'linux' ? '/snap/bin/chromium' : undefined;

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