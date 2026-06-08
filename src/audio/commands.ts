/**
 * Audio commands — thin command layer over the audio engines.
 *
 *   !rap <text>  — rap the text over a generated beat
 *   !tts <text>  — plain text-to-speech
 *
 * This file is intentionally thin: parse args, pick a language, call the engine
 * (which returns an MP3 Buffer), send it as a voice message. All synthesis lives
 * under ./rap and ./tts and knows nothing about WhatsApp.
 */

import { client } from '../clientConfig';
import { safeReply } from '../infra/messaging';
import { log } from '../infra/logger';
import { Language } from './rap/config';
import { createRapTrack } from './rap/rapbot';
import { synthesizeSpeech } from './tts/tts';
import { sendVoice } from './sendVoice';

type Msg = any;
type Handler = (msg: Msg, chatId: string, args: string) => void;
export type AudioCommandMap = Record<string, Handler>;

// Hebrew if the text contains any Hebrew letters, otherwise English.
function detectLanguage(text: string): Language {
  return /[֐-׿]/.test(text) ? 'he' : 'en';
}

// Cap input length so a huge message can't generate a multi-minute MP3 and
// blow up memory on the VPS. ~800 chars is roughly a minute of speech.
const MAX_CHARS = 800;

// Use the command's args, or fall back to the replied-to message's text.
async function resolveText(msg: Msg, args: string): Promise<string> {
  const text = args.trim();
  if (text) return text;
  if (msg.hasQuotedMsg) {
    const quoted = await msg.getQuotedMessage();
    return (quoted.body || '').trim();
  }
  return '';
}

export const audioCommands: AudioCommandMap = {

  '!rap': async (msg, _chatId, args) => {
    const text = await resolveText(msg, args);
    if (!text) { await safeReply(client, msg, 'Usage: `!rap <text>` (or reply to a message)'); return; }
    if (text.length > MAX_CHARS) { await safeReply(client, msg, `Too long — keep it under ${MAX_CHARS} characters.`); return; }
    try {
      const mp3 = await createRapTrack(text, detectLanguage(text));
      if (!mp3) { await safeReply(client, msg, 'Failed to make a rap (the vocalizer may be down).'); return; }
      await sendVoice(msg, mp3);
    } catch (err: any) {
      log('rap error', err.message);
      await safeReply(client, msg, `Rap failed: ${err.message}`);
    }
  },

  '!tts': async (msg, _chatId, args) => {
    const text = await resolveText(msg, args);
    if (!text) { await safeReply(client, msg, 'Usage: `!tts <text>` (or reply to a message)'); return; }
    if (text.length > MAX_CHARS) { await safeReply(client, msg, `Too long — keep it under ${MAX_CHARS} characters.`); return; }
    try {
      const mp3 = await synthesizeSpeech(text, detectLanguage(text));
      if (!mp3) { await safeReply(client, msg, 'Failed to synthesize speech.'); return; }
      await sendVoice(msg, mp3);
    } catch (err: any) {
      log('tts error', err.message);
      await safeReply(client, msg, `TTS failed: ${err.message}`);
    }
  },

};
