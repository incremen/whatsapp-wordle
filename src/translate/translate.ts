import axios from 'axios';

const LINGVA_URL = 'https://lingva.ml/api/v1';

const languageMap: Record<string, string> = {
    'en': 'en',
    'english': 'en',
    'he': 'iw',
    'hebrew': 'iw',
    'arabic': 'ar',
    'spanish': 'es',
    'french': 'fr',
    'russian': 'ru',
    'german': 'de',
    'italian': 'it',
    'japanese': 'ja',
    'chinese': 'zh',
    'portuguese': 'pt',
    'hindi': 'hi',
    'dutch': 'nl',
    'turkish': 'tr',
    'korean': 'ko',
};

export async function translateText(text: string, targetLanguage?: string): Promise<string> {
    const normalizedLang = (targetLanguage || 'en').toLowerCase();
    const mappedCode = languageMap[normalizedLang] || normalizedLang;

    const { data } = await axios.get(`${LINGVA_URL}/auto/${mappedCode}/${encodeURIComponent(text)}`);
    return data.translation;
}
