import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getOrCreateSession, stopSession, clearSession, runClaudePrompt } from '../services/claude.service';

const chatRoute = new Hono();

chatRoute.use('*', cors());

chatRoute.get('/session/:projectId', (c) => {
  const projectId = c.req.param('projectId');
  const session = getOrCreateSession(projectId);
  return c.json({
    sessionId: session.sessionId,
    projectId: session.projectId,
    isRunning: session.isRunning,
    messages: session.messages,
  });
});

chatRoute.post('/send/:projectId', async (c) => {
  const projectId = c.req.param('projectId');
  const body = await c.req.json() as { prompt: string };
  if (!body.prompt) {
    return c.json({ error: 'Missing prompt' }, 400);
  }

  const session = getOrCreateSession(projectId);
  if (session.isRunning) {
    return c.json({ error: 'Claude sedang memproses giliran sebelumnya' }, 409);
  }

  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let isAborted = false;

  const readable = new ReadableStream<Uint8Array>({
    start(ctl) {
      controller = ctl;
    },
    cancel() {
      isAborted = true;
      if (session.sessionId) {
        stopSession(session.sessionId);
      }
    },
  });

  const send = (msg: Record<string, unknown>): void => {
    if (isAborted || !controller) return;
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
    } catch {}
  };

  // Keepalive ping setiap 5 detik — cegah browser/OS putus koneksi SSE saat Claude berpikir lama
  const keepalive = setInterval(() => {
    if (isAborted || !controller) {
      clearInterval(keepalive);
      return;
    }
    try {
      controller.enqueue(encoder.encode(': keepalive\n\n'));
    } catch {
      clearInterval(keepalive);
    }
  }, 5000);

  runClaudePrompt(session, body.prompt, (event) => {
    send(event);
    if (event.type === 'done' || event.type === 'error') {
      clearInterval(keepalive);
      if (controller) {
        try { controller.close(); } catch {}
        controller = null;
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
});

chatRoute.post('/stop/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId');
  const stopped = stopSession(sessionId);
  return c.json({ stopped });
});

chatRoute.post('/clear/:projectId', (c) => {
  const projectId = c.req.param('projectId');
  clearSession(projectId);
  return c.json({ ok: true });
});

export { chatRoute };
