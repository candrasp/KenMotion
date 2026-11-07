import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectsRoot } from './project.service';

export interface StyleOverride {
  scene: string;
  selector: string;
  style: Record<string, string>;
  text?: string;
  timeOffset?: number;
}

export function getProjectFixes(projectId: string): StyleOverride[] {
  const fixesPath = join(getProjectsRoot(), projectId, 'fixes.json');
  if (!existsSync(fixesPath)) {
    return [];
  }
  try {
    const raw = readFileSync(fixesPath, 'utf-8');
    return JSON.parse(raw) as StyleOverride[];
  } catch {
    return [];
  }
}

export function saveProjectFixes(projectId: string, fixes: StyleOverride[]): boolean {
  const fixesPath = join(getProjectsRoot(), projectId, 'fixes.json');
  try {
    writeFileSync(fixesPath, JSON.stringify(fixes, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to save fixes.json:', err);
    return false;
  }
}

export interface SrtSubtitle {
  index: number;
  start: number;
  end: number;
  text: string;
}

export function parseSrt(srtContent: string): SrtSubtitle[] {
  const blocks = srtContent.trim().split(/\r?\n\r?\n/);
  const results: SrtSubtitle[] = [];

  const timeToSeconds = (timeStr: string): number => {
    // Format: 00:01:23,456 atau 00:01:23.456 atau 00:01:23,45
    const [hms, ms] = timeStr.trim().split(/[,.]/);
    const [h, m, s] = hms.split(':').map((n) => parseFloat(n));
    const msFraction = ms ? parseFloat(`0.${ms}`) : 0;
    return h * 3600 + m * 60 + s + msFraction;
  };

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const timeLineIndex = lines[0].includes('-->') ? 0 : 1;
    const timeLine = lines[timeLineIndex];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->');
    const textLines = lines.slice(timeLineIndex + 1);

    results.push({
      index: results.length + 1,
      start: timeToSeconds(startStr),
      end: timeToSeconds(endStr),
      text: textLines.join(' '),
    });
  }

  return results;
}

