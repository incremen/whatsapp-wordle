import { translate } from '@vitalets/google-translate-api';

const languageMap: Record<string, string> = {
    'en': 'en',
    'english': 'en',
    'he': 'he',
    'hebrew': 'he',
    'arabic': 'ar',
    'spanish': 'es',
    'french': 'fr',
    'russian': 'ru',
    'german': 'de',
    'italian': 'it',
    'japanese': 'ja',
    'chinese': 'zh-CN',
    'portuguese': 'pt',
    'hindi': 'hi',
    'dutch': 'nl',
    'turkish': 'tr',
    'korean': 'ko',
};

export async function translateText(text: string, targetLanguage?: string): Promise<string> {
    const normalizedLang = (targetLanguage || 'en').toLowerCase();
    const mappedCode = languageMap[normalizedLang] || normalizedLang;

    const result = await translate(text, { from: 'auto', to: mappedCode });
    return result.text;
}
    