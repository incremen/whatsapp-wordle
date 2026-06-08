/**
 * createRapTrack — the orchestrator.
 *
 * This is the "big function that calls a lot of small ones". Read top to bottom
 * to understand the whole pipeline; each step lives in its own module:
 *
 *   text + language
 *        │
 *        ├─ (Hebrew only) addNikkud .............. nikkud.ts   add vowel points
 *        ├─ randomRiff / buildBassLoop ........... bass.ts     the bassline
 *        ├─ buildDrumLoop ........................ drums.ts    the drum loop
 *        ├─ generateVocals ....................... vocals.ts   syllable-aligned rap
 *        └─ assembleArrangement .................. arrangement.ts  mix → MP3 Buffer
 *
 * Returns the finished MP3 as an in-memory Buffer (no file written), or null if
 * the track failed. All intermediate WAVs are UUID-named and deleted in the
 * `finally`, so nothing accumulates on disk.
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import { BPM, Language } from './config';
import { TEMP_DIR } from './modules/paths';
import { addNikkud } from './modules/nikkud';
import { randomRiff, buildBassLoop } from './modules/bass';
import { buildDrumLoop } from './modules/drums';
import { generateVocals, calculateWPM } from './modules/vocals';
import { assembleArrangement } from './modules/arrangement';

export async function createRapTrack(text: string, language: Language): Promise<Buffer | null> {
  const reqId = crypto.randomUUID();
  const vocalFile = path.join(TEMP_DIR, `${reqId}_vocals.wav`);
  const drumLoopFile = path.join(TEMP_DIR, `${reqId}_drums.wav`);
  const bassLoopFile = path.join(TEMP_DIR, `${reqId}_bass.wav`);
  const bpm = BPM[language];

  try {
    // 1. Prepare the text. Hebrew needs nikkud (and English chars stripped, as
    //    they make the Hebrew voice output gibberish).
    let lyrics = text;
    if (language === 'he') {
      lyrics = await addNikkud(text.replace(/[a-zA-Z]/g, ''));
    }

    // 2. Build the backing track. The riff is shared: it's both synthesized
    //    into the audible bass AND used to pitch the vocals (autotune).
    const riff = randomRiff();
    await buildBassLoop(bpm, riff, bassLoopFile, `${bassLoopFile}.work`);
    await buildDrumLoop(bpm, drumLoopFile);

    // 3. Build the vocals (syllable-aligned, swung, autotuned to the riff).
    await generateVocals(lyrics, language, bpm, riff, vocalFile);

    // 4. Put it all together: intro → body → outro, mixed to one MP3 Buffer.
    const mp3 = await assembleArrangement(vocalFile, drumLoopFile, bassLoopFile, bpm);

    console.log(`[rap ${language}] BPM=${bpm} WPM=${calculateWPM(lyrics, bpm, language)} riff=[${riff.map((f) => f.toFixed(0)).join(' ')}] -> ${mp3.length} bytes`);
    return mp3;
  } catch (error) {
    console.error('Rap pipeline error:', error);
    return null;
  } finally {
    // Remove every intermediate even if a step threw — nothing left on disk.
    for (const f of [vocalFile, drumLoopFile, bassLoopFile]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }
}
