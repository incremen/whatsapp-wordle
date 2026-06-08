/**
 * Plain text-to-speech: espeak-ng straight to an MP3 Buffer. No beat, no
 * rhythm, no autotune — just the spoken voice. (For the musical version see
 * ../rap/rapbot.ts.)
 *
 * Shares the rap engine's low-level helpers and Hebrew vocalization so there's
 * one source of truth for "how we run ffmpeg" and "how we add nikkud".
 */

import { execFilePromise, runFfmpegToBuffer } from '../rap/modules/audio';
import { addNikkud } from '../rap/modules/nikkud';
import { ESPEAK_BINARY, Language } from '../rap/config';

/**
 * Synthesize `text` in `language` and return it as an MP3 Buffer, or null on
 * failure (e.g. Hebrew nikkud lookup fails). Nothing is written to disk: espeak
 * streams WAV to stdout, piped straight into ffmpeg's stdin and out as MP3.
 */
export async function synthesizeSpeech(text: string, language: Language): Promise<Buffer | null> {
  try {
    let words = text;
    if (language === 'he') {
      // Add nikkud. Latin words are kept: Nakdan leaves them untouched and
      // espeak-ng 1.52's Hebrew voice auto-switches to English for them, so
      // mixed text like "שלום aquarium" reads correctly.
      words = await addNikkud(text);
    }
    const pitch = language === 'he' ? 60 : 70;

    // espeak WAV -> stdout (pipe:1), then ffmpeg stdin -> MP3 -> stdout.
    const { stdout: wav } = await execFilePromise(
      ESPEAK_BINARY,
      ['-v', language, '-p', String(pitch), '--stdout', words],
      { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 },
    );

    // OGG/Opus so WhatsApp renders it as a voice note that plays on phone apps too.
    return await runFfmpegToBuffer(['-hide_banner', '-y', '-i', 'pipe:0', '-c:a', 'libopus', '-b:a', '32k', '-f', 'ogg', 'pipe:1'], wav as Buffer);
  } catch (error) {
    console.error('TTS error:', error);
    return null;
  }
}
