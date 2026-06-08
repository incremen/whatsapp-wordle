/**
 * Hebrew vocalization (nikkud) via the Dicta Nakdan API.
 *
 * eSpeak's Hebrew voice needs vowel points to pronounce words correctly. This
 * module sends raw Hebrew to Nakdan and returns the vocalized string.
 *
 * Resilience:
 *  - in-memory cache keyed on the raw string (avoid re-hitting the API)
 *  - AbortController with a strict timeout
 *  - on ANY error/timeout it THROWS a descriptive error rather than silently
 *    falling back to raw text. (A silent fallback once masked a real bug: a
 *    missing `genre` field returned HTTP 503 but looked like a timeout.)
 */

import { NAKDAN_URL, NAKDAN_TIMEOUT_MS } from '../config';

// key: raw Hebrew string, value: vocalized (nikkud) string
const cache = new Map<string, string>();

export async function addNikkud(text: string): Promise<string> {
  if (cache.has(text)) return cache.get(text)!;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NAKDAN_TIMEOUT_MS);

  try {
    const response = await fetch(NAKDAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'nakdan',
        data: text,
        // `genre` is REQUIRED — omitting it returns HTTP 503. "modern" suits
        // contemporary Hebrew.
        genre: 'modern',
        addmorph: true,
        keepmetagim: false,
        keepqq: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Nakdan HTTP ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 200)}` : ''}`);
    }

    const result: any = await response.json();

    // Dicta returns an array of word objects; the first option's first element
    // is the vocalized word. Concatenate, stripping the morpheme separator '|'
    // that Dicta inserts (e.g. וּ|בָא) — espeak would choke on it.
    const vocalized: string = result
      .map((wordObj: any) => {
        if (wordObj?.options?.[0]) {
          const opt = wordObj.options[0];
          return Array.isArray(opt) ? opt[0] : opt;
        }
        return wordObj?.word ?? '';
      })
      .join('')
      .replace(/\|/g, '');

    if (!vocalized) throw new Error('Nakdan returned empty vocalization');

    cache.set(text, vocalized);
    return vocalized;
  } catch (error) {
    // No silent fallback: surface the real failure. An aborted fetch (timeout)
    // throws an AbortError; relabel it clearly.
    const reason =
      error instanceof Error && error.name === 'AbortError'
        ? `timed out after ${NAKDAN_TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    throw new Error(`Nakdan vocalization failed: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}
