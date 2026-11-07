import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectsRoot } from '../project.service';
import { getProjectAudioManifest } from '../audio/audio.service';
import { parseStoryboard } from '../../lib/storyboard';

export interface CheckFinding {
  type: 'overflow' | 'safe_area' | 'script_mismatch' | 'timing' | 'empty_scene' | 'font_error' | 'base64_found' | 'no_spec' | 'audio_issue';
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

export interface SceneInspectionResult {
  scene: string;
  start: number;
  end: number;
  expectedScript: string;
  actualScript: string;
  findings: CheckFinding[];
}

export interface GlobalFinding {
  type: CheckFinding['type'];
  severity: CheckFinding['severity'];
  message: string;
  affectedScenes: string[];
}

export interface InspectionSummary {
  projectId: string;
  totalScenes: number;
  passedCount: number;
  issuesCount: number;
  globalFindings: GlobalFinding[];
  scenes: SceneInspectionResult[];
  fixPrompt: string;
}

export async function inspectProject(projectId: string): Promise<InspectionSummary> {
  const projectDir = join(getProjectsRoot(), projectId);
  const storyboardPath = join(projectDir, 'storyboard.md');
  const indexPath = join(projectDir, 'index.html');

  if (!existsSync(storyboardPath) || !existsSync(indexPath)) {
    throw new Error('Project storyboard.md or index.html missing');
  }

  const storyboardContent = readFileSync(storyboardPath, 'utf-8');
  const expectedScenes = parseStoryboard(storyboardContent);

  const globalFindings: GlobalFinding[] = [];
  const results: SceneInspectionResult[] = [];

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1920 },
    });

  // ?render=1 menyembunyikan UI bawaan HTML
  const fileUrl = `http://127.0.0.1:3031/projects/${projectId}/index.html?render=1`;
  await page.goto(fileUrl);

  await page.evaluate(async () => {
    const win = window as Window & { __ready?: Promise<unknown> };
    if (win.__ready) await win.__ready;
  });

  // Cek apakah HTML mengikuti SPEC (ada elemen .scene[data-scene])
  const hasSpecScenes = await page.evaluate(() => {
    return document.querySelectorAll('.scene[data-scene]').length > 0;
  });

  // Cek apakah __seek tersedia
  const hasSeek = await page.evaluate(() => {
    const win = window as Window & { __seek?: unknown };
    return typeof win.__seek === 'function';
  });

  // Cek __duration dari HTML vs storyboard
  const htmlDuration = await page.evaluate(() => {
    const win = window as Window & { __duration?: number };
    return typeof win.__duration === 'number' ? win.__duration : null;
  });

  const storyboardDuration = expectedScenes.length > 0
    ? expectedScenes[expectedScenes.length - 1].end
    : 0;

  // Jika HTML tidak memiliki data-scene sama sekali, laporkan satu temuan global
  if (!hasSpecScenes) {
    globalFindings.push({
      type: 'no_spec',
      severity: 'error',
      message: 'HTML tidak memiliki elemen `.scene[data-scene]`. HTML belum mengikuti SPEC.md.',
      affectedScenes: expectedScenes.map((s) => s.scene),
    });
  }

  if (!hasSeek) {
    globalFindings.push({
      type: 'no_spec',
      severity: 'error',
      message: 'HTML tidak mengekspos `window.__seek`. Fungsi seek tidak tersedia.',
      affectedScenes: [],
    });
  }

  if (htmlDuration !== null && Math.abs(htmlDuration - storyboardDuration) > 0.5) {
    globalFindings.push({
      type: 'timing',
      severity: 'warning',
      message: `Durasi HTML (${htmlDuration.toFixed(2)}s) berbeda dari storyboard (${storyboardDuration.toFixed(2)}s).`,
      affectedScenes: [],
    });
  }

  // Kalau HTML sudah sesuai SPEC, periksa tiap scene
  if (hasSpecScenes && hasSeek) {
    for (const scene of expectedScenes) {
      const midPoint = scene.start + (scene.end - scene.start) / 2;

      await page.evaluate((t: number) => {
        const win = window as Window & { __seek?: (t: number) => void };
        if (typeof win.__seek === 'function') win.__seek(t);
      }, midPoint);

      const checkData = await page.evaluate((sceneNum: string) => {
        const el = document.querySelector(`.scene[data-scene="${sceneNum}"]`) as HTMLElement | null;
        if (!el) return { exists: false, isVisible: false, actualScript: '', overflow: false, outsideSafe: false, fontLoaded: true };

        const style = window.getComputedStyle(el);
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') > 0.05;
        const scriptEl = el.querySelector('[data-script]');
        const actualScript = scriptEl?.textContent?.trim() || '';

        let outsideSafe = false;
        let overflow = false;
        // Hanya cek elemen teks atau interaktif visual penting, bukan background, SVG filter, atau script tag tersembunyi
        const textElements = Array.from(el.querySelectorAll('p:not([data-script]), h1, h2, h3, h4, span, b, em, .chip, .ch, .tile, .cd, .big, .no, .kw'));
        for (const node of textElements) {
          const r = (node as HTMLElement).getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const nodeStyle = window.getComputedStyle(node as HTMLElement);
          if (nodeStyle.visibility === 'hidden' || parseFloat(nodeStyle.opacity || '1') < 0.1) continue;

          // Batas toleran: Safe area (Top: 100px, Bottom: 1800px, Left: 30px, Right: 1050px)
          if (r.left < 30 || r.right > 1050 || r.top < 100 || r.bottom > 1820) {
            outsideSafe = true;
          }
          // Overflow kanvas
          if (r.right > 1100 || r.left < -20 || r.bottom > 1940 || r.top < -20) {
            overflow = true;
          }
        }

        const fontLoaded = document.fonts ? document.fonts.status === 'loaded' : true;
        return { exists: true, isVisible, actualScript, overflow, outsideSafe, fontLoaded };
      }, scene.scene);

      const findings: CheckFinding[] = [];

      if (!checkData.exists) {
        findings.push({ type: 'empty_scene', severity: 'error', message: `Elemen scene tidak ditemukan` });
      } else {
        if (!checkData.isVisible) {
          findings.push({ type: 'empty_scene', severity: 'error', message: `Scene tidak terlihat di titik tengah (${midPoint.toFixed(2)}s)` });
        }
        if (scene.script && checkData.actualScript !== scene.script) {
          findings.push({
            type: 'script_mismatch', severity: 'warning',
            message: 'Teks script tidak cocok dengan storyboard',
            details: `Storyboard: "${scene.script}" | HTML: "${checkData.actualScript}"`,
          });
        }
        if (checkData.overflow) {
          findings.push({ type: 'overflow', severity: 'error', message: 'Elemen meluber melebihi canvas 1080×1920' });
        }
        if (checkData.outsideSafe) {
          findings.push({ type: 'safe_area', severity: 'warning', message: 'Elemen berada di luar safe area' });
        }
        if (!checkData.fontLoaded) {
          findings.push({ type: 'font_error', severity: 'error', message: 'Font belum selesai termuat' });
        }
      }

      results.push({
        scene: scene.scene,
        start: scene.start,
        end: scene.end,
        expectedScript: scene.script,
        actualScript: checkData.actualScript,
        findings,
      });
    }

    // Kelompokkan temuan global yang sama (semua scene punya finding sama)
    const findingTypes: CheckFinding['type'][] = ['empty_scene', 'overflow', 'safe_area', 'font_error'];
    for (const ft of findingTypes) {
      const affected = results.filter((r) => r.findings.some((f) => f.type === ft));
      if (affected.length >= 2 && affected.length === results.length) {
        const sample = affected[0].findings.find((f) => f.type === ft)!;
        globalFindings.push({
          type: ft,
          severity: sample.severity,
          message: `${sample.message} — semua scene terdampak.`,
          affectedScenes: affected.map((r) => r.scene),
        });
        // Hapus dari hasil individual agar tidak muncul dua kali
        for (const r of results) {
          r.findings = r.findings.filter((f) => f.type !== ft);
        }
      }
    }
  } else {
    // Isi hasil scene dengan placeholder (tanpa findings per-scene)
    for (const scene of expectedScenes) {
      results.push({
        scene: scene.scene,
        start: scene.start,
        end: scene.end,
        expectedScript: scene.script,
        actualScript: '',
        findings: [],
      });
    }
  }
} finally {
  await browser.close();
}

  // Cek isu audio dari AudioManifest
  const audioManifest = getProjectAudioManifest(projectId);
  for (const aIssue of audioManifest.issues) {
    globalFindings.push({
      type: aIssue.type === 'overlap' || aIssue.type === 'duration_mismatch' ? 'timing' : 'audio_issue',
      severity: aIssue.severity,
      message: `[AUDIO] ${aIssue.message}${aIssue.details ? ` (${aIssue.details})` : ''}`,
      affectedScenes: [],
    });
  }

  const issuesCount = results.filter((r) => r.findings.length > 0).length + globalFindings.filter((g) => g.severity === 'error').length;
  const passedCount = results.filter((r) => r.findings.length === 0).length;

  // Susun prompt perbaikan yang ringkas
  const promptLines: string[] = [];
  for (const g of globalFindings) {
    promptLines.push(`[GLOBAL] ${g.message}`);
  }
  for (const r of results) {
    if (r.findings.length > 0) {
      promptLines.push(`- Scene ${r.scene}: ` + r.findings.map((f) => f.message + (f.details ? ` (${f.details})` : '')).join('; '));
    }
  }

  const fixPrompt = promptLines.length > 0
    ? `Tolong perbaiki index.html sesuai storyboard.md dan SPEC.md:\n${promptLines.join('\n')}`
    : 'Semua scene memenuhi spesifikasi.';

  return {
    projectId,
    totalScenes: results.length,
    passedCount,
    issuesCount,
    globalFindings,
    scenes: results,
    fixPrompt,
  };
}
