import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getProjectsRoot } from './project.service';

export async function extractVideoFrames(
  projectId: string,
  videoFileName: string,
  fps: number = 1
): Promise<{ success: boolean; outputDir: string; frameCount: number }> {
  const projectDir = join(getProjectsRoot(), projectId);
  const assetsDir = join(projectDir, 'assets');
  const videoPath = resolve(assetsDir, videoFileName);

  if (!videoPath.startsWith(assetsDir) || !existsSync(videoPath) || !statSync(videoPath).isFile()) {
    throw new Error(`Video file not found or invalid: ${videoFileName}`);
  }

  const outputDir = join(projectDir, 'assets', 'extracted-frames');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPattern = join(outputDir, 'frame-%04d.png');

  const args = [
    '-y',
    '-i', videoPath,
    '-vf', `fps=${fps}`,
    outputPattern,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, outputDir, frameCount: 0 });
      } else {
        reject(new Error(`FFmpeg frame extraction exited with code ${code}`));
      }
    });
  });
}

