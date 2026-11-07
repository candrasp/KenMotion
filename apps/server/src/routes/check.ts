import { Hono } from 'hono';
import { inspectProject } from '../services/checker/checker.service';

const checkRoute = new Hono();

checkRoute.post('/:id', async (c) => {
  const projectId = c.req.param('id');
  try {
    const report = await inspectProject(projectId);
    return c.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 500);
  }
});

export { checkRoute };

