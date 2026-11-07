import { Hono } from 'hono';
import { getProjectAudioManifest } from '../services/audio/audio.service';

const audioRoute = new Hono();

audioRoute.get('/:id/manifest', (c) => {
  const projectId = c.req.param('id');
  const manifest = getProjectAudioManifest(projectId);
  return c.json(manifest);
});

export { audioRoute };

