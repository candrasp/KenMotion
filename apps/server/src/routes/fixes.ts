import { Hono } from 'hono';
import { getProjectFixes, saveProjectFixes, parseSrt, type StyleOverride } from '../services/fixes.service';
import { extractVideoFrames } from '../services/import.service';

const fixesRoute = new Hono();

// GET /fixes/:id
fixesRoute.get('/:id', (c) => {
  const projectId = c.req.param('id');
  const fixes = getProjectFixes(projectId);
  return c.json(fixes);
});

// POST /fixes/:id
fixesRoute.post('/:id', async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json() as StyleOverride[];
  const success = saveProjectFixes(projectId, body);
  if (!success) {
    return c.json({ error: 'Failed to save fixes' }, 500);
  }
  return c.json({ success: true, count: body.length });
});

// POST /fixes/:id/import-srt
fixesRoute.post('/:id/import-srt', async (c) => {
  const body = await c.req.json() as { srt: string };
  if (!body.srt) {
    return c.json({ error: 'Missing srt text content' }, 400);
  }
  const subtitles = parseSrt(body.srt);
  return c.json({ count: subtitles.length, subtitles });
});

// POST /fixes/:id/extract-video
fixesRoute.post('/:id/extract-video', async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json() as { videoFile: string; fps?: number };
  if (!body.videoFile) {
    return c.json({ error: 'Missing videoFile parameter' }, 400);
  }
  try {
    const result = await extractVideoFrames(projectId, body.videoFile, body.fps || 1);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Extraction error';
    return c.json({ error: message }, 500);
  }
});

export { fixesRoute };

