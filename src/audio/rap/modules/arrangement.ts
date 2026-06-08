/**
 * Arrangement & mix: layer the three pieces (bass loop, drum loop, vocals) into
 * the final MP3.
 *
 *   bass riff loop ──────────────────────────────────────────────  (whole track)
 *   drum loop            ────────────────────────────              (body only)
 *   vocals                    ──────────────────                   (body only)
 *   timeline:   [ intro ][        body         ][ outro ]
 *
 *  - INTRO : the bass riff plays alone (drums + vocals delayed in)
 *  - BODY  : bass + drums + vocals together, for the vocal's duration
 *  - OUTRO : the bass riff plays one more bar alone, then stops cleanly
 *
 * The drum/bass LOOPS are short (BARS_PER_LOOP bars); `-stream_loop` repeats
 * them to cover the needed span — they are NOT stretched. Mix levels live in
 * config (MIX). Everything is resampled to OUTPUT_SAMPLE_RATE first because
 * espeak emits 22050 Hz and a bare amix of mismatched rates breaks the result.
 */

import { runFfmpegToBuffer, probeDuration } from './audio';
import { BARS_PER_LOOP, INTRO_BARS, MAX_TRACK_SECONDS, MIX, OUTPUT_SAMPLE_RATE, VOCAL_EQ } from '../config';

/** Mix the layers and return the final MP3 as an in-memory Buffer (no file). */
export async function assembleArrangement(
  vocalFile: string,
  drumLoopFile: string,
  bassLoopFile: string,
  bpm: number,
): Promise<Buffer> {
  const beat = 60 / bpm;
  const barLen = 2 * beat;
  const loopLen = BARS_PER_LOOP * barLen;
  const sr = String(OUTPUT_SAMPLE_RATE);

  const introSec = INTRO_BARS * beat;
  const vocalLen = await probeDuration(vocalFile);

  const drumStartSec = 2 * beat; // half-bar lead-in before the drop
  const bodyEndSec = introSec + vocalLen;
  const drumSpan = bodyEndSec - drumStartSec;
  const outroSec = barLen; // one bass bar after the vocals, then a clean stop
  // Vocals are already capped in generateVocals; this is just a safety net so
  // the final file never exceeds the hard limit.
  const totalSec = Math.min(bodyEndSec + outroSec, MAX_TRACK_SECONDS);

  // stream_loop n => the input plays n+1 times. Be generous; -t trims the tail.
  const bassLoops = Math.ceil(totalSec / loopLen) + 1;
  const drumLoops = Math.ceil(drumSpan / loopLen) + 1;

  const drumDelayMs = Math.round(drumStartSec * 1000);
  const vocalDelayMs = Math.round(introSec * 1000);

  const filter =
    `[0:a]aformat=sample_rates=${sr}:channel_layouts=mono,volume=${MIX.bass}[bass];` +
    `[1:a]aformat=sample_rates=${sr}:channel_layouts=mono,atrim=0:${drumSpan.toFixed(3)},volume=${MIX.drums},adelay=${drumDelayMs}|${drumDelayMs}[drums];` +
    `[2:a]aformat=sample_rates=${sr}:channel_layouts=mono,${VOCAL_EQ},adelay=${vocalDelayMs}|${vocalDelayMs},volume=${MIX.vocals}[voc];` +
    `[bass][drums][voc]amix=inputs=3:duration=longest:normalize=0,volume=${MIX.master},alimiter=limit=${MIX.limit}[out]`;

  // Output OGG/Opus to stdout (pipe:1) and capture it as a Buffer — no file
  // written, so nothing accumulates on disk. Opus-in-Ogg is the format WhatsApp
  // needs for a voice note (PTT) that plays on both web and phone apps.
  return runFfmpegToBuffer([
    '-hide_banner', '-y',
    '-stream_loop', String(bassLoops), '-i', bassLoopFile,
    '-stream_loop', String(drumLoops), '-i', drumLoopFile,
    '-i', vocalFile,
    '-filter_complex', filter,
    '-map', '[out]',
    '-t', totalSec.toFixed(3),
    '-c:a', 'libopus', '-b:a', '32k',
    '-f', 'ogg',
    'pipe:1',
  ]);
}
