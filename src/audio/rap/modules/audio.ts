/**
 * Low-level audio process helpers. Everything that shells out to ffmpeg /
 * ffprobe goes through here, using execFile with argument arrays (never a
 * shell string) so user text can never be interpreted as a command.
 */

import { execFile, spawn } from 'child_process';
import util from 'util';
import fs from 'fs';
import { FFMPEG_BINARY, FFPROBE_BINARY } from '../config';

export const execFilePromise = util.promisify(execFile);

/** Run ffmpeg with the given argument array. */
export async function runFfmpeg(args: string[]): Promise<void> {
  await execFilePromise(FFMPEG_BINARY, args);
}

/**
 * Run a single ffmpeg with a complex filtergraph supplied as an array of graph
 * lines. The lines are joined with ';' and written to a temp script file passed
 * via -filter_complex_script — this avoids the OS command-line length limit for
 * big graphs and leaves a human-readable file you can inspect on failure.
 *
 * `graphLines`  : filtergraph statements, e.g. `[0:a]atrim=0:0.5[d0]` (no
 *                 trailing ';' — joined here, one per line for readability).
 * `inputArgs`   : ffmpeg args BEFORE the filtergraph (e.g. ['-i', file]); may be
 *                 empty for pure-synth graphs (aevalsrc/anoisesrc need no input).
 * `outLabel`    : the graph's final output pad to -map (default '[out]').
 * `outputArgs`  : trailing output args (codec/-ac/-ar/-t) then the output path.
 * `scriptPath`  : where to write the (auto-deleted) graph file.
 */
export async function runFfmpegGraph(opts: {
  inputArgs?: string[];
  graphLines: string[];
  outLabel?: string;
  outputArgs: string[];
  scriptPath: string;
}): Promise<void> {
  const { inputArgs = [], graphLines, outLabel = '[out]', outputArgs, scriptPath } = opts;
  fs.writeFileSync(scriptPath, graphLines.join(';\n') + '\n');
  try {
    await execFilePromise(FFMPEG_BINARY, [
      '-hide_banner', '-y',
      ...inputArgs,
      '-filter_complex_script', scriptPath,
      '-map', outLabel,
      ...outputArgs,
    ]);
  } finally {
    if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
  }
}

/**
 * Run ffmpeg and capture its stdout as a binary Buffer (for piping the final
 * MP3 to memory via `pipe:1` instead of writing a file). `args` must direct
 * output to `pipe:1` with an explicit `-f <fmt>` (no extension to infer from).
 * Pass `stdin` to feed input data via `pipe:0` (e.g. a WAV from espeak).
 */
export async function runFfmpegToBuffer(args: string[], stdin?: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BINARY, args);
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    proc.stdout.on('data', (c) => chunks.push(c));
    proc.stderr.on('data', (c) => errChunks.push(c));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(errChunks).toString().slice(-500)}`));
    });
    if (stdin) proc.stdin.end(stdin);
    else proc.stdin.end();
  });
}

/** Read a media file's duration in seconds via ffprobe (0 if unknown). */
export async function probeDuration(file: string): Promise<number> {
  const { stdout } = await execFilePromise(FFPROBE_BINARY, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1',
    file,
  ]);
  return parseFloat(String(stdout).trim()) || 0;
}
