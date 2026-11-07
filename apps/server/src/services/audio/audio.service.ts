import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectsRoot, getLibraryRoot } from '../project.service';
import { parseStoryboard, type StoryboardScene } from '../../lib/storyboard';

export interface AudioCue {
  scene: string;
  offset: number;
  file: string;
  volume: number;
  absoluteTime?: number;
  resolvedUrl?: string;
  resolvedFilePath?: string;
}

export interface AudioInspectionIssue {
  type: 'missing_file' | 'clipping' | 'overlap' | 'duration_mismatch';
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

export interface AudioManifest {
  hasNarasi: boolean;
  hasMusik: boolean;
  cues: AudioCue[];
  narasiUrl?: string;
  narasiFilePath?: string;
  musikUrl?: string;
  musikFilePath?: string;
  issues: AudioInspectionIssue[];
}

export function getProjectAudioManifest(projectId: string): AudioManifest {
  const projectDir = join(getProjectsRoot(), projectId);
  const assetsDir = join(projectDir, 'assets');
  const libraryDir = getLibraryRoot();
  const cuesPath = join(projectDir, 'cues.json');
  const storyboardPath = join(projectDir, 'storyboard.md');

  let scenes: StoryboardScene[] = [];
  if (existsSync(storyboardPath)) {
    scenes = parseStoryboard(readFileSync(storyboardPath, 'utf-8'));
  }

  // 1. Narasi: Spesifik per proyek (lokal)
  let hasNarasi = false;
  let narasiUrl: string | undefined;
  let narasiFilePath: string | undefined;

  const audioSubDir = join(assetsDir, 'audio');
  const candidateNarasiPaths = [
    join(audioSubDir, 'narasi.mp3'),
    join(audioSubDir, 'narasi.wav'),
    join(assetsDir, 'narasi.mp3'),
    join(assetsDir, 'narasi.wav'),
  ];

  for (const p of candidateNarasiPaths) {
    if (existsSync(p)) {
      hasNarasi = true;
      narasiFilePath = p;
      const rel = p.replace(projectDir, '').replace(/\\/g, '/').replace(/^\//, '');
      narasiUrl = `/projects/${projectId}/${rel}`;
      break;
    }
  }

  // Fallback dinamis: cari file audio pertama di folder assets/
  if (!hasNarasi && existsSync(assetsDir)) {
    try {
      const assetFiles = readdirSync(assetsDir);
      const audioFile = assetFiles.find((f) => f.endsWith('.mp3') || f.endsWith('.wav'));
      if (audioFile) {
        const p = join(assetsDir, audioFile);
        hasNarasi = true;
        narasiFilePath = p;
        narasiUrl = `/projects/${projectId}/assets/${audioFile}`;
      }
    } catch {}
  }

  // 2. Musik (BGM): Cek lokal proyek dulu, lalu fallback ke library/audio/bgm
  let hasMusik = false;
  let musikUrl: string | undefined;
  let musikFilePath: string | undefined;

  const localBgm = join(assetsDir, 'audio', 'musik.mp3');
  const globalBgmDir = join(libraryDir, 'audio', 'bgm');

  if (existsSync(localBgm)) {
    hasMusik = true;
    musikUrl = `/projects/${projectId}/assets/audio/musik.mp3`;
    musikFilePath = localBgm;
  } else if (existsSync(globalBgmDir)) {
    const bgmFiles = readdirSync(globalBgmDir).filter((f) => f.endsWith('.mp3') || f.endsWith('.wav'));
    if (bgmFiles.length > 0) {
      hasMusik = true;
      musikUrl = `/library/audio/bgm/${bgmFiles[0]}`;
      musikFilePath = join(globalBgmDir, bgmFiles[0]);
    }
  }

  // 3. SFX Cues: Cek lokal proyek dulu, lalu fallback ke library/audio/sfx
  let rawCues: AudioCue[] = [];
  if (existsSync(cuesPath)) {
    try {
      rawCues = JSON.parse(readFileSync(cuesPath, 'utf-8'));
    } catch {
      rawCues = [];
    }
  }

  const issues: AudioInspectionIssue[] = [];
  const sceneMap = new Map<string, number>();
  for (const sc of scenes) {
    sceneMap.set(sc.scene, sc.start);
  }

  const mappedCues: AudioCue[] = [];
  for (const cue of rawCues) {
    const sceneStart = sceneMap.get(cue.scene);
    const absTime = sceneStart !== undefined ? sceneStart + (cue.offset || 0) : undefined;

    // Bersihkan nama file
    const cleanFileName = cue.file.replace(/^[/\\]+/, '').split(/[/|\\]/).pop() || cue.file;

    // Resolusi: Lokal vs Library
    const localSfx = join(assetsDir, 'audio', 'sfx', cleanFileName);
    const globalSfx = join(libraryDir, 'audio', 'sfx', cleanFileName);

    let resolvedUrl: string | undefined;
    let resolvedFilePath: string | undefined;

    if (existsSync(localSfx)) {
      resolvedUrl = `/projects/${projectId}/assets/audio/sfx/${cleanFileName}`;
      resolvedFilePath = localSfx;
    } else if (existsSync(globalSfx)) {
      resolvedUrl = `/library/audio/sfx/${cleanFileName}`;
      resolvedFilePath = globalSfx;
    } else {
      issues.push({
        type: 'missing_file',
        severity: 'error',
        message: `File SFX "${cleanFileName}" tidak ditemukan di lokal maupun library/audio/sfx/`,
        details: `Scene ${cue.scene} (+${cue.offset}s)`,
      });
    }

    mappedCues.push({
      ...cue,
      absoluteTime: absTime,
      resolvedUrl,
      resolvedFilePath,
    });
  }

  // Cek overlapping cues
  for (let i = 0; i < mappedCues.length; i++) {
    for (let j = i + 1; j < mappedCues.length; j++) {
      const a = mappedCues[i].absoluteTime;
      const b = mappedCues[j].absoluteTime;
      if (a !== undefined && b !== undefined && Math.abs(a - b) < 0.03) {
        issues.push({
          type: 'overlap',
          severity: 'warning',
          message: `Dua SFX menumpuk pada waktu yang hampir sama (${a.toFixed(2)}s)`,
          details: `${mappedCues[i].file} & ${mappedCues[j].file}`,
        });
      }
    }
  }

  return {
    hasNarasi,
    hasMusik,
    cues: mappedCues,
    narasiUrl,
    narasiFilePath,
    musikUrl,
    musikFilePath,
    issues,
  };
}
