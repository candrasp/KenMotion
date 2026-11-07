import { Hono } from 'hono';
import { renderProject, cancelRender, getActiveJob } from '../services/render/render.service';
import type { RenderProgress } from '../services/render/render.service';

const renderRoute = new Hono();

/** POST /render/:id?fps=30&resolution=720p — mulai render, response SSE */
renderRoute.post('/:id', async (c) => {
  const projectId = c.req.param('id');
  const fps = Math.min(60, Math.max(1, parseInt(c.req.query('fps') || '30', 10)));
  const resQuery = c.req.query('resolution');
  const resolution: '720p' | '1080p' = resQuery === '1080p' ? '1080p' : '720p';

  const existing = getActiveJob();
  if (existing) {
    return c.json({ error: `Render "${existing.projectId}" sedang berjalan.` }, 409);
  }

  // SSE stream
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const send = async (data: RenderProgress): Promise<void> => {
    const line = `data: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(line));
  };

  // Jalankan render di background, jangan await di sini
  renderProject(projectId, fps, resolution, (progress) => {
    send(progress).catch(() => {});
    if (progress.status === 'done' || progress.status === 'cancelled' || progress.status === 'error') {
      writer.close().catch(() => {});
    }
  }).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Error tidak diketahui';
    send({ status: 'error', frame: 0, totalFrames: 0, fps, error: msg }).catch(() => {});
    writer.close().catch(() => {});
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

/** DELETE /render — batalkan render aktif */
renderRoute.delete('/', (c) => {
  const cancelled = cancelRender();
  return c.json({ cancelled });
});

/** GET /render/status — cek apakah ada render aktif */
renderRoute.get('/status', (c) => {
  const job = getActiveJob();
  return c.json({ active: job !== null, projectId: job?.projectId ?? null });
});

export { renderRoute };

