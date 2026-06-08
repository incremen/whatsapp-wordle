/**
 * Filesystem layout for the audio engine's short-lived intermediates.
 *
 * We use a subdirectory of the OS temp dir (not the repo) — every intermediate
 * is UUID-named and deleted as soon as its track finishes, so nothing
 * accumulates. There is NO bulk wipe: a long-running bot serving concurrent
 * requests must never delete another request's in-flight files.
 */

import os from 'os';
import path from 'path';
import fs from 'fs';

export const TEMP_DIR = path.join(os.tmpdir(), 'wa-rap');

// Ensure the temp dir exists (idempotent; safe to call on module load).
fs.mkdirSync(TEMP_DIR, { recursive: true });
