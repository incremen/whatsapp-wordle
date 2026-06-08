/**
 * Central configuration: every tunable knob lives here so the rest of the code
 * reads like a description of WHAT happens, not magic numbers.
 */

export type Language = 'en' | 'he';

// --- Tempo -----------------------------------------------------------------
// Constant BPM per language (the bot no longer randomizes tempo).
export const BPM: Record<Language, number> = {
  en: 142,
  he: 152,
};

// --- Vocal rhythm ----------------------------------------------------------
// espeak WPM is clamped to this range so speech stays intelligible & stable.
export const WPM_MIN = 80;
export const WPM_MAX = 350;

// Hard cap on output length. Syllables whose grid position falls past this are
// DROPPED before the filtergraph is built (not rendered then trimmed) — so a
// huge input never turns into a huge amount of work. The final track is also
// hard-trimmed to this length as a safety net.
export const MAX_TRACK_SECONDS = 60;

// Swing: off-beat (odd-index) syllables are nudged late by this fraction of an
// 8th-note slot, for a shuffled groove instead of a dead-on-grid robot feel.
export const SWING = 0.2;

// Autotune: each syllable is pitch-shifted (via rubberband) toward its aligned
// bass-riff note. PARTIAL on purpose — the target note changes every syllable
// (it follows the riff), so a full snap (1.0) makes the voice leap wildly
// between syllables (theremin effect). A gentle 0.15 nudges the contour toward
// the bass without big jumps. (0 = off.)
export const AUTOTUNE_STRENGTH = 0.15;

// Emphasis volumes by beat position (downbeat / other on-beat / off-beat),
// giving the flow its "1-&-2-&" rhythmic pump.
// Kept tight: a wide swing (e.g. 1.4 vs 0.8) chops the volume several times a
// second at rap WPM, which sounds like tremolo/"helicopter". Subtle accents +
// SWING timing carry the groove instead.
export const EMPHASIS = {
  downbeat: 1.15,
  onBeat: 1.0,
  offBeat: 0.9,
};

// Phrasing: rappers don't talk continuously — they rap a few bars, take a
// breath, then continue. After every PHRASE_BARS bars of vocals we insert a
// silent gap of PHRASE_GAP_BEATS beats. The gap lands on a bar boundary so it
// always falls at the same spot in the beat. Set PHRASE_GAP_BEATS = 0 to
// disable and rap continuously.
export const PHRASE_BARS = 2; // rap this many bars...
export const PHRASE_GAP_BEATS = 1; // ...then rest this many beats (a 1-beat gap
// at 142+ BPM is only ~400ms and reads as a glitch; 2 beats is a real breath)

// --- Backing track ---------------------------------------------------------
export const BARS_PER_LOOP = 2; // both the drum and bass loops are two bars
// Half-time groove: snare on beat 3 only (not 2 & 4). At 142-152 BPM a normal
// backbeat sounds like fast techno; half-time is the trap/drill feel that fits.
export const HALF_TIME = true;
export const INTRO_BARS = 4; // 8th-note count of bass-alone intro before the drop

// A-minor pentatonic in a low (bass) octave, in Hz: A1 C2 D2 E2 G2 A2.
export const BASS_SCALE = [55.0, 65.41, 73.42, 82.41, 98.0, 110.0];

// --- Mix levels (tuned by ear) ---------------------------------------------
export const MIX = {
  bass: 0.9,
  drums: 0.8,
  vocals: 1.0, // espeak is harsh; don't push it over the beat
  master: 0.85,
  limit: 0.95,
};

// EQ applied to the vocal before mixing. espeak is a raw formant synth: it has
// low-end rumble that muddies the bass and harsh highs. Highpass clears the
// bass frequencies; the treble cut tames the abrasive top end.
export const VOCAL_EQ = 'highpass=f=150,treble=g=-3';

// --- External tools & sample rates -----------------------------------------
export const ESPEAK_BINARY = 'espeak-ng';
export const FFMPEG_BINARY = 'ffmpeg';
export const FFPROBE_BINARY = 'ffprobe';
export const OUTPUT_SAMPLE_RATE = 44100;
export const ESPEAK_SAMPLE_RATE = 22050; // espeak-ng native output rate

// --- Nakdan (Hebrew vocalization) API --------------------------------------
export const NAKDAN_URL = 'https://nakdan-2-0.loadbalancer.dicta.org.il/api';
export const NAKDAN_TIMEOUT_MS = 4000;
