/**
 * Drum loop synthesis — a boom-bap pattern, exactly BARS_PER_LOOP bars long,
 * built entirely from FFmpeg lavfi sources:
 *   - kick : pitch-dropping sine on beats 1 & 3 (the "thump")
 *   - snare: high-passed noise burst on beats 2 & 4 (the backbeat)
 *   - hats : short high-passed noise tick on every 8th note
 *
 * The loop is deterministic per BPM. (Commas inside aevalsrc expressions are
 * escaped as `\,` — `\\,` in the JS literal — since lavfi treats a bare comma
 * as a filter separator.)
 */

import { runFfmpeg } from './audio';
import { BARS_PER_LOOP, HALF_TIME, OUTPUT_SAMPLE_RATE } from '../config';

export async function buildDrumLoop(bpm: number, outPath: string): Promise<void> {
  const beat = 60 / bpm;
  const sr = String(OUTPUT_SAMPLE_RATE);
  const bar = (2 * beat).toFixed(6); // kick period (2 beats)
  const eighth = (beat / 2).toFixed(6); // hats period (8th note)
  const loopLen = (BARS_PER_LOOP * 2 * beat).toFixed(6);

  // Snare placement: standard backbeat = beats 2 & 4 (period 1 bar, offset
  // 1 beat). Half-time = beat 3 only (period 2 bars, offset 2 beats).
  const snarePeriod = HALF_TIME ? (4 * beat).toFixed(6) : bar;
  const snareOffset = HALF_TIME ? (2 * beat).toFixed(6) : beat.toFixed(6);

  const kick =
    `aevalsrc='0.9*exp(-16*mod(t\\,${bar}))*sin(2*PI*(48*mod(t\\,${bar})+4*(1-exp(-28*mod(t\\,${bar})))))':d=${loopLen}:s=${sr}`;
  const snare =
    `aevalsrc='0.6*exp(-34*mod(t+${snareOffset}\\,${snarePeriod}))*(2*random(0)-1)':d=${loopLen}:s=${sr}`;
  const hats =
    `aevalsrc='0.25*exp(-150*mod(t\\,${eighth}))*(2*random(1)-1)':d=${loopLen}:s=${sr}`;

  const filter =
    '[1:a]highpass=f=1500[snare];' +
    '[2:a]highpass=f=7000[hats];' +
    '[0:a][snare][hats]amix=inputs=3:duration=shortest:normalize=0,lowpass=f=12000,alimiter=limit=0.95[beat]';

  await runFfmpeg([
    '-y',
    '-f', 'lavfi', '-i', kick,
    '-f', 'lavfi', '-i', snare,
    '-f', 'lavfi', '-i', hats,
    '-filter_complex', filter,
    '-map', '[beat]',
    '-ac', '1', '-ar', sr,
    '-t', loopLen,
    outPath,
  ]);
}
