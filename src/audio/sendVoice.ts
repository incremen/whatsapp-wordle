/**
 * Send an in-memory audio Buffer as a WhatsApp voice message (PTT).
 *
 * Bridges the audio engines (which return raw MP3 Buffers and know nothing
 * about WhatsApp) to whatsapp-web.js. Nothing touches disk — the Buffer goes
 * straight to base64 in a MessageMedia.
 */

import { client } from '../clientConfig';
import { safeReply } from '../infra/messaging';

const { MessageMedia } = require('whatsapp-web.js');

export async function sendVoice(msg: any, mp3: Buffer): Promise<void> {
  const media = new MessageMedia('audio/mpeg', mp3.toString('base64'), 'voice.mp3');
  // sendAudioAsVoice renders it as a playable voice note rather than a file.
  await safeReply(client, msg, media, { sendAudioAsVoice: true });
}
