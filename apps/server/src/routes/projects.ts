import { Hono } from 'hono';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { listProjects, getProjectFilePath, getProjectsRoot, getProjectTree } from '../services/project.service';
import { parseStoryboard } from '../lib/storyboard';
import { createFileResponse } from '../lib/file-response';

const projectsRoute = new Hono();

projectsRoute.get('/', (c) => {
  return c.json(listProjects());
});

projectsRoute.get('/:id/storyboard', (c) => {
  const projectId = c.req.param('id');
  const sbPath = join(getProjectsRoot(), projectId, 'storyboard.md');
  if (!existsSync(sbPath)) {
    return c.json({ error: 'Storyboard not found' }, 404);
  }
  const content = readFileSync(sbPath, 'utf-8');
  const scenes = parseStoryboard(content);
  return c.json({ raw: content, scenes });
});

projectsRoute.get('/:id/tree', (c) => {
  const projectId = c.req.param('id');
  const tree = getProjectTree(projectId);
  return c.json({ projectId, tree });
});

projectsRoute.get('/:id/*', (c) => {
  const projectId = c.req.param('id');
  const rawPath = c.req.path.replace(`/projects/${projectId}/`, '');
  let wildCardPath = rawPath;
  try {
    wildCardPath = decodeURIComponent(rawPath);
  } catch {}
  const relativePath = wildCardPath === '' || wildCardPath === '/' ? 'index.html' : wildCardPath;

  const filePath = getProjectFilePath(projectId, relativePath);
  if (!filePath) {
    return c.text('Not found', 404);
  }

  return createFileResponse(filePath, c.req.header('range'));
});

export { projectsRoute };

