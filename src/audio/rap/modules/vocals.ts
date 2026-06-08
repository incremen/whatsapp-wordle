/**
 * Vocals: turn text into a rhythmically-aligned, lightly-autotuned rap vocal.
 *
 * Pipeline (see generateVocals):
 *   1. synthesize the WHOLE phrase with espeak-ng (correct pronunciation)
 *   2. detect syllable segments in the rendered audio (energy envelope)
 *   3. for each syllable: time-stretch to one 8th-note slot, pitch-shift to
 *      follow the bass riff (autotune), and apply beat-position emphasis
 *   4. place syllables on the 8th-note grid with swing, then mix
 *
 * espeak's flat timbre is unchanged — only timing, pitch contour and emphasis
 * are shaped here.
 */

import fs from 'fs';
import { execFilePromise, runFfmpeg, runFfmpegGraph } from './audio';
import {
  AUTOTUNE_STRENGTH,
  BASS_SCALE,
  EMPHASIS,
  ESPEAK_BINARY,
  ESPEAK_SAMPLE_RATE,
  pickVoice,
  INTRO_BARS,
  Language,
  MAX_TRACK_SECONDS,
  OUTPUT_SAMPLE_RATE,
  PHRASE_BARS,
  PHRASE_GAP_BEATS,
  SWING,
  WPM_MAX,
  WPM_MIN,
} from '../config';

// --- Tempo math ------------------------------------------------------------

/**
 * Estimate syllable count.
 *  - English: vowel-cluster approximation.
 *  - Hebrew (vocalized): count vowel niqqud directly — each syllable carries
 *    one vowel point (excluding silent sheva U+05B0 and the dagesh U+05BC).
 *  - Hebrew (unvocalized fallback): letters / 2.
 * Clamped to >= 1 so the duration math never divides by zero.
 */
export function countSyllables(text: string, language: Language): number {
  if (language === 'he') {
    const vowelPoints = (text.match(/[ֱ-ׇֻ]/g) || []).length;
    if (vowelPoints > 0) return vowelPoints;
    const letters = (text.match(/[א-ת]/g) || []).length;
    return Math.max(1, Math.round(letters / 2));
  }
  const matches = text.split(/[aeiouy]+[^$e(,.:;!?)]/gi).length;
  return Math.max(1, matches);
}

/**
 * eSpeak WPM that lands the speech on the beat grid (8th notes = 2 syl/beat):
 *   targetDuration(min) = syllables / (bpm * 2);  WPM = words / targetDuration
 * Clamped to [WPM_MIN, WPM_MAX].
 */
export function calculateWPM(text: string, bpm: number, language: Language): number {
  const wordCount = Math.max(1, text.trim().split(/\s+/).filter(Boolean).length);
  const syllables = countSyllables(text, language);
  const targetDurationMinutes = syllables / (bpm * 2);
  const wpm = Math.floor(wordCount / targetDurationMinutes);
  return Math.min(Math.max(wpm, WPM_MIN), WPM_MAX);
}

// --- Syllable detection ----------------------------------------------------

/**
 * Detect syllable segments in a rendered speech WAV via its energy envelope.
 * Syllable nuclei (vowels) are loud → local maxima of short-time RMS energy;
 * the quietest point between two nuclei is the cut. Returns [startSec, endSec]
 * pairs, one per detected syllable.
 */
async function detectSyllableSegments(rawWav: string, workPrefix: string): Promise<Array<[number, number]>> {
  const SR = ESPEAK_SAMPLE_RATE;
  const pcmPath = `${workPrefix}.pcm`;

  await runFfmpeg(['-hide_banner', '-y', '-i', rawWav, '-ac', '1', '-ar', String(SR), '-f', 's16le', pcmPath]);

  try {
    const buf = fs.readFileSync(pcmPath);
    const n = Math.floor(buf.length / 2);
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = buf.readInt16LE(i * 2) / 32768;

    // Short-time RMS energy (~10ms hop, ~20ms window).
    const hop = Math.round(0.01 * SR);
    const win = Math.round(0.02 * SR);
    const nf = Math.max(0, Math.floor((n - win) / hop));
    const env = new Float32Array(nf);
    for (let f = 0; f < nf; f++) {
      let s = 0;
      for (let j = 0; j < win; j++) {
        const v = x[f * hop + j];
        s += v * v;
      }
      env[f] = Math.sqrt(s / win);
    }

    // Smooth with a 5-frame moving average to suppress spurious peaks.
    const sm = new Float32Array(nf);
    for (let f = 0; f < nf; f++) {
      let s = 0;
      let c = 0;
      for (let k = -2; k <= 2; k++) {
        const g = f + k;
        if (g >= 0 && g < nf) {
          s += env[g];
          c++;
        }
      }
      sm[f] = c ? s / c : 0;
    }

    let gmax = 0;
    for (let f = 0; f < nf; f++) gmax = Math.max(gmax, sm[f]);
    if (gmax === 0) return [];
    const thr = 0.18 * gmax;

    // Nuclei = local maxima above threshold, kept >= 100ms apart.
    const nuclei: number[] = [];
    const minGap = Math.round((0.1 * SR) / hop);
    for (let f = 1; f < nf - 1; f++) {
      if (sm[f] > thr && sm[f] >= sm[f - 1] && sm[f] > sm[f + 1]) {
        const last = nuclei[nuclei.length - 1];
        if (nuclei.length && f - last < minGap) {
          if (sm[f] > sm[last]) nuclei[nuclei.length - 1] = f; // keep the louder peak
        } else {
          nuclei.push(f);
        }
      }
    }
    if (nuclei.length === 0) return [];

    // Boundaries = energy minimum between consecutive nuclei.
    const cuts: number[] = [0];
    for (let i = 0; i < nuclei.length - 1; i++) {
      let mi = nuclei[i];
      let mv = Infinity;
      for (let f = nuclei[i]; f <= nuclei[i + 1]; f++) {
        if (sm[f] < mv) {
          mv = sm[f];
          mi = f;
        }
      }
      cuts.push(mi);
    }
    cuts.push(nf);

    const segs: Array<[number, number]> = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      segs.push([(cuts[i] * hop) / SR, (cuts[i + 1] * hop) / SR]);
    }
    return segs;
  } finally {
    if (fs.existsSync(pcmPath)) fs.unlinkSync(pcmPath);
  }
}

// --- Vocal generation ------------------------------------------------------

/** Volume multiplier for a syllable based on where it sits on the beat grid. */
function emphasisFor(index: number): number {
  if (index % 4 === 0) return EMPHASIS.downbeat; // beats 1 & 3
  if (index % 2 === 0) return EMPHASIS.onBeat; // beats 2 & 4
  return EMPHASIS.offBeat; // off-beats
}

export async function generateVocals(
  text: string,
  language: Language,
  bpm: number,
  riff: number[],
  outputFile: string,
): Promise<void> {
  const wpm = calculateWPM(text, bpm, language);
  const pitch = language === 'he' ? 60 : 70; // slightly lower for Hebrew

  // Autotune targets: each bass-riff note (Hz) -> semitones above the root,
  // centered in the scale's octave. Syllable i follows riff note i.
  const root = BASS_SCALE[0];
  const octaveCenter = 6; // BASS_SCALE spans ~one octave (0..12 semitones)
  const riffSemitones = riff.map((f) => 12 * Math.log2(f / root));

  const workPrefix = `${outputFile}.work`;
  const rawWav = `${workPrefix}.raw.wav`;
  const sr = String(OUTPUT_SAMPLE_RATE);

  try {
    // 1. Whole-phrase synthesis (execFile arg array => no shell injection).
    await execFilePromise(ESPEAK_BINARY, ['-v', pickVoice(language), '-p', String(pitch), '-s', String(wpm), '-w', rawWav, text]);

    // 2. Detect syllables in the rendered audio.
    const segs = await detectSyllableSegments(rawWav, workPrefix);
    if (segs.length === 0) {
      fs.copyFileSync(rawWav, outputFile); // nothing detected -> use raw synthesis
      return;
    }

    const slot = 60 / bpm / 2;

    // Vocal-timeline budget: the arrangement frames the vocals with an intro
    // (INTRO_BARS beats) and a one-bar outro, so the vocals themselves get the
    // remainder of MAX_TRACK_SECONDS. Syllables past this are dropped below —
    // never added to the graph, so an over-long input is never worked on.
    const beat = 60 / bpm;
    const introSec = INTRO_BARS * beat;
    const outroSec = 2 * beat; // one bar
    const maxVocalSec = Math.max(0, MAX_TRACK_SECONDS - introSec - outroSec);

    // Assign each syllable a GRID SLOT. Normally slot = syllable index, but we
    // insert phrasing gaps: after every phrase (PHRASE_BARS bars = that many
    // 8th-note slots) we skip PHRASE_GAP_BEATS beats so the rapper "breathes".
    // Everything downstream (emphasis, autotune, swing, placement) keys off the
    // grid slot — NOT the syllable index — so accents stay locked to the beat
    // even after a gap shifts the two apart.
    const candidates = segs.filter(([a, b]) => b - a >= 0.04);
    const slotsPerBar = 8; // 2 eighth-notes per beat * 4 beats
    const phraseSlots = PHRASE_BARS * slotsPerBar;
    const gapSlots = PHRASE_GAP_BEATS * 2;
    const kept: Array<[number, number]> = [];
    const gridSlotOf: number[] = [];
    let gridSlot = 0;
    let slotsThisPhrase = 0;
    for (let k = 0; k < candidates.length; k++) {
      if (gridSlot * slot >= maxVocalSec) break; // past the cap -> stop, don't process
      kept.push(candidates[k]);
      gridSlotOf.push(gridSlot);
      gridSlot += 1;
      slotsThisPhrase += 1;
      if (gapSlots > 0 && slotsThisPhrase >= phraseSlots) {
        gridSlot += gapSlots; // breathe
        slotsThisPhrase = 0;
      }
    }
    if (kept.length < candidates.length) {
      console.log(`  (capped at ${MAX_TRACK_SECONDS}s: dropped ${candidates.length - kept.length} of ${candidates.length} syllables)`);
    }

    // 3 + 4 in ONE ffmpeg call. Fan the single raw vocal out with asplit into
    // one branch per syllable; each branch trims its syllable window, stretches
    // it to a slot, autotunes to its bass note, applies emphasis, pads to the
    // slot, and delays to its grid position (with swing). Then amix them all.
    // (Previously this was one ffmpeg PER syllable plus a final placement pass.)
    const slotMs = slot * 1000;
    const swingMs = SWING * slotMs;

    const lines: string[] = [];
    lines.push(`[0:a]asplit=${kept.length}${kept.map((_, k) => `[in${k}]`).join('')}`);
    for (let k = 0; k < kept.length; k++) {
      const [a, b] = kept[k];
      const gs = gridSlotOf[k];
      const tempo = Math.min(2, Math.max(0.5, (b - a) / slot)); // atempo's valid range
      const semis = (riffSemitones[gs % riffSemitones.length] - octaveCenter) * AUTOTUNE_STRENGTH;
      const pitchRatio = Math.pow(2, semis / 12);
      const vol = emphasisFor(gs);
      const onset = Math.round(gs * slotMs + (gs % 2 === 1 ? swingMs : 0));
      // atrim keeps source timestamps -> asetpts resets each branch to t=0.
      lines.push(
        `[in${k}]atrim=${a.toFixed(4)}:${b.toFixed(4)},asetpts=PTS-STARTPTS,` +
          `atempo=${tempo.toFixed(4)},rubberband=pitch=${pitchRatio.toFixed(4)},volume=${vol},` +
          `apad,atrim=0:${slot.toFixed(4)},adelay=${onset}|${onset}[d${k}]`,
      );
    }
    lines.push(
      `${kept.map((_, k) => `[d${k}]`).join('')}amix=inputs=${kept.length}:duration=longest:normalize=0,` +
        `aformat=sample_rates=${sr}:channel_layouts=mono[out]`,
    );

    await runFfmpegGraph({
      inputArgs: ['-i', rawWav],
      graphLines: lines,
      outputArgs: [outputFile],
      scriptPath: `${workPrefix}.vocalgraph.txt`,
    });
  } finally {
    if (fs.existsSync(rawWav)) fs.unlinkSync(rawWav);
  }
}
