import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { projectsRoute } from './routes/projects';
import { checkRoute } from './routes/check';
import { renderRoute } from './routes/render';
import { audioRoute } from './routes/audio';
import { libraryRoute } from './routes/library';
import { fixesRoute } from './routes/fixes';
import { chatRoute } from './routes/chat';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'KenMotion Server' });
});

app.route('/projects', projectsRoute);
app.route('/check', checkRoute);
app.route('/render', renderRoute);
app.route('/audio', audioRoute);
app.route('/library', libraryRoute);
app.route('/fixes', fixesRoute);
app.route('/chat', chatRoute);

// Sajikan frontend statis hasil build (apps/web/dist) jika ada
const WEB_DIST = resolve(import.meta.dir, '../../web/dist');
const INDEX_HTML = resolve(WEB_DIST, 'index.html');

if (existsSync(WEB_DIST)) {
  app.use('/*', serveStatic({ root: WEB_DIST }));
  app.get('*', (c) => {
    if (existsSync(INDEX_HTML)) {
      return new Response(Bun.file(INDEX_HTML), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return c.text('Not found', 404);
  });
}

export default {
  port: 3031,
  hostname: '127.0.0.1',
  fetch: app.fetch,
};
