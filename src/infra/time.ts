const TZ = 'Asia/Jerusalem';

export function todayDate(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

export function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString('he-IL', { timeZone: TZ });
}
