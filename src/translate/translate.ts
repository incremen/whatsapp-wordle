import { log } from '../infra/logger';

const languageMap: Record<string, string> = {
    'en': 'en', 'english': 'en',
    'he': 'iw', 'hebrew': 'iw',
    'arabic': 'ar', 'ar': 'ar',
    'spanish': 'es', 'es': 'es',
    'french': 'fr', 'fr': 'fr',
    'russian': 'ru', 'ru': 'ru',
    'german': 'de', 'de': 'de',
    'italian': 'it', 'it': 'it',
    'japanese': 'ja', 'ja': 'ja',
    'chinese': 'zh', 'zh': 'zh',
    'portuguese': 'pt', 'pt': 'pt',
    'hindi': 'hi', 'hi': 'hi',
    'dutch': 'nl', 'nl': 'nl',
    'turkish': 'tr', 'tr': 'tr',
    'korean': 'ko', 'ko': 'ko',
};

const instances = [
    'https://lingva.ml',
    'https://lingva.lunar.icu',
    'https://translate.projectsegfau.lt',
    'https://translate.dr460nf1r3.org',
];

export async function translateText(text: string, targetLanguage?: string): Promise<string> {
    const normalizedLang = (targetLanguage || 'en').toLowerCase();
    const mappedCode = languageMap[normalizedLang] || normalizedLang;
    const encodedText = encodeURIComponent(text);

    for (const instance of instances) {
        try {
            const res = await fetch(`${instance}/api/v1/auto/${mappedCode}/${encodedText}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as any;
            if (data?.translation) return data.translation;
            throw new Error('Invalid response format');
        } catch (err: any) {
            log('Translate', `${instance} failed: ${err.message}`);
        }
    }

    throw new Error('All translation instances failed');
}
