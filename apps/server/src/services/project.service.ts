import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

export interface ProjectInfo {
  id: string;
  hasStoryboard: boolean;
  hasHtml: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
}

const ROOT_DIR = resolve(process.cwd(), '../..');
const PROJECTS_ROOT = resolve(ROOT_DIR, 'projects');
const LIBRARY_ROOT = resolve(ROOT_DIR, 'library');

export function getProjectsRoot(): string {
  return PROJECTS_ROOT;
}

export function getLibraryRoot(): string {
  return LIBRARY_ROOT;
}

export function listProjects(): ProjectInfo[] {
  if (!existsSync(PROJECTS_ROOT)) {
    return [];
  }

  const entries = readdirSync(PROJECTS_ROOT);
  const projects: ProjectInfo[] = [];

  for (const entry of entries) {
    const fullPath = join(PROJECTS_ROOT, entry);
    if (statSync(fullPath).isDirectory()) {
      projects.push({
        id: entry,
        hasStoryboard: existsSync(join(fullPath, 'storyboard.md')),
        hasHtml: existsSync(join(fullPath, 'index.html'))
      });
    }
  }

  return projects;
}

export function getProjectFilePath(projectId: string, relativePath: string): string | null {
  const safeRelative = relativePath.replace(/^(\.\.(\/|\\|$))+/, '');
  const projectDir = join(PROJECTS_ROOT, projectId);
  const targetPath = join(projectDir, safeRelative);

  if (!targetPath.startsWith(projectDir)) {
    return null;
  }

  if (existsSync(targetPath) && statSync(targetPath).isFile()) {
    return targetPath;
  }

  return null;
}

export function getProjectTree(projectId: string): FileNode[] {
  const projectDir = join(PROJECTS_ROOT, projectId);
  if (!existsSync(projectDir)) {
    return [];
  }

  function readDirRecursive(dirPath: string, relativeDir: string): FileNode[] {
    const entries = readdirSync(dirPath);
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      const fullPath = join(dirPath, entry);
      const relPath = relativeDir ? `${relativeDir}/${entry}` : entry;
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        nodes.push({
          name: entry,
          path: relPath,
          type: 'directory',
          children: readDirRecursive(fullPath, relPath),
        });
      } else {
        nodes.push({
          name: entry,
          path: relPath,
          type: 'file',
          size: stat.size,
        });
      }
    }

    // Urutkan: direktori dulu, lalu file secara alfabetis
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  return readDirRecursive(projectDir, '');
}

export function getLibraryFilePath(relativePath: string): string | null {
  const safeRelative = relativePath.replace(/^(\.\.(\/|\\|$))+/, '');
  const targetPath = join(LIBRARY_ROOT, safeRelative);

  if (!targetPath.startsWith(LIBRARY_ROOT)) {
    return null;
  }

  if (existsSync(targetPath) && statSync(targetPath).isFile()) {
    return targetPath;
  }

  return null;
}
