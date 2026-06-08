/**
 * Bass riff — a random minor-pentatonic line, plus its synthesis into a loop.
 *
 * The riff is an array of note frequencies (one per 8th note). It is used in
 * two places: synthesized here into the audible bass loop, AND read by the
 * vocals module so each syllable can be pitch-shifted to follow its bass note.
 */

import { runFfmpegGraph } from './audio';
import { BARS_PER_LOOP, BASS_SCALE, OUTPUT_SAMPLE_RATE } from '../config';

/**
 * Generate a random bass riff: BARS_PER_LOOP bars of 8th notes from the minor
 * pentatonic scale. The root (A) is favoured on each bar's downbeat so the
 * randomized line still resolves musically rather than sounding chaotic.
 */
export function randomRiff(): number[] {
  const stepsPerBar = 8; // 8th notes
  const total = BARS_PER_LOOP * stepsPerBar;
  const riff: number[] = [];
  for (let i = 0; i < total; i++) {
    const onDownbeat = i % 4 === 0;
    if (onDownbeat && Math.random() < 0.7) {
      riff.push(BASS_SCALE[0]); // root
    } else {
      riff.push(BASS_SCALE[Math.floor(Math.random() * BASS_SCALE.length)]);
    }
  }
  return riff;
}

/**
 * Synthesize a riff into a single looped WAV, one 8th note per entry. Each note
 * is a plucked bass tone (fundamental + a little 2nd harmonic, exp. decay)
 * occupying exactly one 8th-note slot.
 *
 * The whole loop is built in ONE ffmpeg call: every note is its own in-graph
 * `aevalsrc`, and a single `concat` joins them. (Previously this spawned one
 * ffmpeg per note + a concat — ~17 processes and as many temp files.)
 */
export async function buildBassLoop(
  bpm: number,
  riff: number[],
  outPath: string,
  workPrefix: string,
): Promise<void> {
  const slot = 60 / bpm / 2; // 8th note in seconds
  const sr = String(OUTPUT_SAMPLE_RATE);

  // One aevalsrc per note -> [n0],[n1],...  then concat them all -> [out].
  const lines = riff.map((f, i) => {
    const expr = `(0.7*sin(2*PI*${f.toFixed(2)}*t)+0.2*sin(2*PI*${(f * 2).toFixed(2)}*t))*exp(-5*t)`;
    return `aevalsrc='${expr}':d=${slot.toFixed(4)}:s=${sr}[n${i}]`;
  });
  lines.push(`${riff.map((_, i) => `[n${i}]`).join('')}concat=n=${riff.length}:v=0:a=1[out]`);

  await runFfmpegGraph({
    graphLines: lines,
    outputArgs: ['-ac', '1', '-ar', sr, outPath],
    scriptPath: `${workPrefix}.bassgraph.txt`,
  });
}
