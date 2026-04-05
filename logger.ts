import * as os from 'os';

const now = () => new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

const sysInfo = () => {
    const mb = (b: number) => (b / 1024 / 1024).toFixed(0) + 'MB';
    const ram = mb(process.memoryUsage().rss);
    const cpu = os.loadavg()[0].toFixed(2);
    return `RAM:${ram} CPU:${cpu}`;
};

export const log = (event: string, extra = '') =>
    console.log(`[${now()}] [${sysInfo()}] ${event}${extra ? ' | ' + extra : ''}`);
