import { chromium, type Page, type Browser } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectsRoot } from '../project.service';
import { getProjectAudioManifest } from '../audio/audio.service';

export type RenderStatus = 'idle' | 'rendering' | 'mixing' | 'done' | 'cancelled' | 'error';

export interface RenderProgress {
  status: RenderStatus;
  frame: number;
  totalFrames: number;
  fps: number;
  outputPath?: string;
  error?: string;
}

let activeJob: {
  abortController: AbortController;
  projectId: string;
  browser?: Browser;
} | null = null;

export function getActiveJob(): { projectId: string } | null {
  return activeJob ? { projectId: activeJob.projectId } : null;
}

export function cancelRender(): boolean {
  if (!activeJob) return false;
  activeJob.abortController.abort();
  if (activeJob.browser) {
    activeJob.browser.close().catch(() => {});
  }
  activeJob = null;
  return true;
}

async function captureFrame(page: Page, time: number): Promise<Buffer> {
  await page.evaluate((t: number) => {
    const win = window as Window & { __seek?: (t: number) => void };
    if (typeof win.__seek === 'function') win.__seek(t);
  }, time);
  return page.screenshot({ type: 'png' });
}

export async function renderProject(
  projectId: string,
  fps: number,
  resolution: '720p' | '1080p',
  onProgress: (p: RenderProgress) => void
): Promise<void> {
  if (activeJob) {
    throw new Error('Ada render yang sedang berjalan. Batalkan dulu.');
  }

  const abortController = new AbortController();
  activeJob = { abortController, projectId };

  const projectDir = join(getProjectsRoot(), projectId);
  const outDir = join(projectDir, 'out');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tempVideoPath = join(outDir, `temp-video-${timestamp}.mp4`);
  const finalOutputPath = join(outDir, `render-${timestamp}.mp4`);

  // Browser selalu membuka viewport kanvas asli 1080x1920 agar elemen visual tidak terpotong (overflow)
  const BROWSER_WIDTH = 1080;
  const BROWSER_HEIGHT = 1920;

  const browser = await chromium.launch({ headless: true });
  activeJob.browser = browser;
  const page = await browser.newPage({ viewport: { width: BROWSER_WIDTH, height: BROWSER_HEIGHT } });

  try {
    const fileUrl = `http://127.0.0.1:3031/projects/${projectId}/index.html?render=1`;
    await page.goto(fileUrl);
    await page.evaluate(async () => {
      const win = window as Window & { __ready?: Promise<unknown> };
      if (win.__ready) await win.__ready;
    });

    const duration = await page.evaluate((): number => {
      const win = window as Window & { __duration?: number };
      return typeof win.__duration === 'number' ? win.__duration : 0;
    });

    if (duration <= 0) throw new Error('window.__duration tidak valid atau 0');

    const totalFrames = Math.ceil(duration * fps);

    // Langkah 1: Render video visual murni tanpa audio ke temp file (scale ke 720p jika dipilih)
    const ffmpegVideoArgs = [
      '-y',
      '-f', 'image2pipe',
      '-framerate', String(fps),
      '-i', 'pipe:0',
      ...(resolution === '720p' ? ['-vf', 'scale=720:1280'] : []),
      '-vcodec', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '18',
      '-preset', 'fast',
      tempVideoPath,
    ];

    const ffmpegVideo = spawn('ffmpeg', ffmpegVideoArgs, { stdio: ['pipe', 'ignore', 'ignore'] });
    let ffmpegVideoError: Error | null = null;
    ffmpegVideo.on('error', (err) => { ffmpegVideoError = err; });

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (abortController.signal.aborted) {
        ffmpegVideo.stdin.end();
        try { await browser.close(); } catch {}
        if (existsSync(tempVideoPath)) {
          try { rmSync(tempVideoPath, { force: true }); } catch {}
        }
        activeJob = null;
        onProgress({ status: 'cancelled', frame: frameIdx, totalFrames, fps });
        return;
      }

      const t = frameIdx / fps;
      const pngBuffer = await captureFrame(page, t);

      const canWrite = ffmpegVideo.stdin.write(pngBuffer);
      if (!canWrite) {
        await new Promise<void>((resolve) => ffmpegVideo.stdin.once('drain', resolve));
      }

      if (ffmpegVideoError) throw ffmpegVideoError;

      onProgress({ status: 'rendering', frame: frameIdx + 1, totalFrames, fps });
    }

    ffmpegVideo.stdin.end();

    await new Promise<void>((resolve, reject) => {
      ffmpegVideo.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg video keluar dengan kode ${code}`));
      });
    });

    await browser.close();

    // Langkah 2: Audio mixing & ducking jika ada track audio
    const manifest = getProjectAudioManifest(projectId);
    const audioInputs: string[] = [];
    const filterComplexParts: string[] = [];
    const mixLabels: string[] = [];

    let inputIndex = 1; // 0 adalah tempVideoPath

    if (manifest.hasNarasi && manifest.narasiFilePath) {
      audioInputs.push('-i', manifest.narasiFilePath);
      filterComplexParts.push(`[${inputIndex}:a]volume=1.0,aresample=44100[a_narasi]`);
      mixLabels.push('[a_narasi]');
      inputIndex++;
    }

    if (manifest.hasMusik && manifest.musikFilePath) {
      audioInputs.push('-i', manifest.musikFilePath);
      // Musik di-ducking (volume 0.15)
      filterComplexParts.push(`[${inputIndex}:a]volume=0.15,aresample=44100,atrim=0:${duration}[a_musik]`);
      mixLabels.push('[a_musik]');
      inputIndex++;
    }

    // SFX cues yang valid (bisa dari lokal atau library)
    for (const cue of manifest.cues) {
      if (cue.absoluteTime !== undefined && cue.resolvedFilePath) {
        if (existsSync(cue.resolvedFilePath)) {
          audioInputs.push('-i', cue.resolvedFilePath);
          const delayMs = Math.round(cue.absoluteTime * 1000);
          const vol = cue.volume || 0.8;
          filterComplexParts.push(
            `[${inputIndex}:a]volume=${vol},aresample=44100,adelay=${delayMs}|${delayMs}[sfx_${inputIndex}]`
          );
          mixLabels.push(`[sfx_${inputIndex}]`);
          inputIndex++;
        }
      }
    }

    if (mixLabels.length > 0) {
      onProgress({ status: 'mixing', frame: totalFrames, totalFrames, fps });

      filterComplexParts.push(
        `${mixLabels.join('')}amix=inputs=${mixLabels.length}:dropout_transition=2:normalize=0[aout]`
      );

      const ffmpegMixArgs = [
        '-y',
        '-i', tempVideoPath,
        ...audioInputs,
        '-filter_complex', filterComplexParts.join(';'),
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        finalOutputPath,
      ];

      await new Promise<void>((resolve, reject) => {
        const ffmpegMix = spawn('ffmpeg', ffmpegMixArgs, { stdio: 'ignore' });
        ffmpegMix.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg audio mixing keluar dengan kode ${code}`));
        });
      });

      if (existsSync(tempVideoPath)) {
        try { rmSync(tempVideoPath, { force: true }); } catch {}
      }
    } else {
      // Tidak ada audio sama sekali, gunakan temp video langsung
    }

    activeJob = null;
    onProgress({
      status: 'done',
      frame: totalFrames,
      totalFrames,
      fps,
      outputPath: mixLabels.length > 0 ? finalOutputPath : tempVideoPath,
    });
  } catch (err: unknown) {
    try { await browser.close(); } catch {}
    if (existsSync(tempVideoPath)) {
      try { rmSync(tempVideoPath, { force: true }); } catch {}
    }
    activeJob = null;
    const message = err instanceof Error ? err.message : 'Error tidak diketahui';
    onProgress({ status: 'error', frame: 0, totalFrames: 0, fps, error: message });
    throw err;
  }
}
