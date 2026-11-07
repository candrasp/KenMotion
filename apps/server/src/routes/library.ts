import { Hono } from 'hono';
import { getLibraryFilePath } from '../services/project.service';
import { createFileResponse } from '../lib/file-response';

const libraryRoute = new Hono();

libraryRoute.get('/*', (c) => {
  const rawPath = c.req.path.replace('/library/', '');
  let relativePath = rawPath;
  try {
    relativePath = decodeURIComponent(rawPath);
  } catch {}
  const filePath = getLibraryFilePath(relativePath);

  if (!filePath) {
    return c.text('Library asset not found', 404);
  }

  return createFileResponse(filePath, c.req.header('range'));
});

export { libraryRoute };

