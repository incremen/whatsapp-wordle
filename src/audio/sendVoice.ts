/**
 * Send an in-memory audio Buffer as a WhatsApp voice message (PTT).
 *
 * Bridges the audio engines (which return raw OGG/Opus Buffers and know nothing
 * about WhatsApp) to whatsapp-web.js. Nothing touches disk — the Buffer goes
 * straight to base64 in a MessageMedia. Opus-in-Ogg is required for a voice note
 * that plays on the phone apps, not just WhatsApp Web.
 */

import { client } from '../clientConfig';
import { safeReply } from '../infra/messaging';

const { MessageMedia } = require('whatsapp-web.js');

export async function sendVoice(msg: any, ogg: Buffer): Promise<void> {
  const media = new MessageMedia('audio/ogg; codecs=opus', ogg.toString('base64'), 'voice.ogg');
  // sendAudioAsVoice renders it as a playable voice note rather than a file.
  await safeReply(client, msg, media, { sendAudioAsVoice: true });
}
