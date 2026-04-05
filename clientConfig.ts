const PUPPETEER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
];

const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    (process.platform === 'linux' ? '/snap/bin/chromium' : undefined);

export const puppeteerConfig: any = executablePath
    ? { executablePath, args: PUPPETEER_ARGS }  // VPS
    : { browserURL: 'http://localhost:9222' };   // local: run ./chrome.sh first
