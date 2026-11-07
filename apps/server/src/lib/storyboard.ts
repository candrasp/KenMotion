export interface StoryboardScene {
  scene: string;
  start: number;
  end: number;
  script: string;
  visual: string;
}

/** Konversi "MM:SS.ss" ke total detik. */
function parseTimecode(tc: string): number {
  const clean = tc.trim();
  // Format: MM:SS.ss atau MM:SS
  const match = clean.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseFloat(match[2]);
    return mins * 60 + secs;
  }
  // Fallback: angka langsung
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

/**
 * Parser storyboard.md generik.
 * Mendukung dua format tabel:
 *   A) kolom: Scene | Timeline | Script | Visual  (format lama / sample)
 *   B) kolom: Scene | Media | Script + Triggers | Gerak | Skala | ... | Timeline | ...  (format nyata)
 * Kolom Timeline dikenali dengan header "Timeline" (case-insensitive).
 * Kolom Script dikenali dengan header yang mengandung "Script".
 */
export function parseStoryboard(markdown: string): StoryboardScene[] {
  const lines = markdown.split(/\r?\n/);
  const scenes: StoryboardScene[] = [];

  let headers: string[] = [];
  let timelineCol = -1;
  let scriptCol = -1;
  let sceneCol = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;

    const cells = trimmed.split('|').map((p) => p.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

    // Baris separator
    if (cells.every((c) => /^-+$/.test(c))) continue;

    // Baris header
    if (headers.length === 0) {
      headers = cells.map((h) => h.toLowerCase());
      timelineCol = headers.findIndex((h) => h === 'timeline');
      scriptCol = headers.findIndex((h) => h.includes('script'));
      sceneCol = headers.findIndex((h) => h === 'scene');
      if (sceneCol === -1) sceneCol = 0;
      continue;
    }

    if (cells.length < 2) continue;

    const sceneNum = cells[sceneCol] || '';
    if (!sceneNum || sceneNum.toLowerCase() === 'scene') continue;

    let start = 0;
    let end = 0;

    if (timelineCol >= 0 && cells[timelineCol]) {
      // Format "MM:SS.ss - MM:SS.ss"
      const rangeParts = cells[timelineCol].split(/\s*[-–—]\s*/);
      start = parseTimecode(rangeParts[0] || '');
      end = parseTimecode(rangeParts[1] || '');
    }

    const rawScript = scriptCol >= 0 ? (cells[scriptCol] || '') : '';
    // Hapus markdown gambar/badge, sisakan teks biasa
    const script = rawScript.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\*\*|__|\*|_/g, '').trim();

    const visual = cells[1] || '';

    scenes.push({ scene: sceneNum, start, end, script, visual });
  }

  return scenes;
}
