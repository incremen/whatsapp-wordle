import * as os from 'os';

const now = () => new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

const sysInfo = () => {
    const mb = (b: number) => (b / 1024 / 1024).toFixed(0) + 'MB';
    const totalMem = mb(os.totalmem());
    const usedMem = mb(os.totalmem() - os.freemem());
    const cpu = os.loadavg()[0].toFixed(2);
    return `MEM:${usedMem}/${totalMem} CPU:${cpu}`;
};

export const log = (event: string, extra = '') =>
    console.log(`[${now()}] [${sysInfo()}] ${event}${extra ? ' | ' + extra : ''}`);
