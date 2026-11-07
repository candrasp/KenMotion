<script setup lang="ts">
import { ref } from 'vue';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileMusic,
  FileImage,
  File,
  ChevronRight,
  ChevronDown,
} from 'lucide-vue-next';
import type { FileNode } from '../../lib/types';

defineProps<{
  nodes: FileNode[];
  level?: number;
}>();

const openFolders = ref<Set<string>>(new Set(['assets']));

const toggleFolder = (path: string): void => {
  if (openFolders.value.has(path)) {
    openFolders.value.delete(path);
  } else {
    openFolders.value.add(path);
  }
};

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'html' || ext === 'js' || ext === 'ts' || ext === 'json') return FileCode;
  if (ext === 'md' || ext === 'srt' || ext === 'txt') return FileText;
  if (ext === 'mp3' || ext === 'wav' || ext === 'ogg') return FileMusic;
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'svg' || ext === 'webp') return FileImage;
  return File;
};
</script>

<template>
  <ul class="tree-list">
    <li v-for="node in nodes" :key="node.path" class="tree-item">
      <div
        v-if="node.type === 'directory'"
        class="tree-row directory"
        :style="{ paddingLeft: `${(level || 0) * 12 + 8}px` }"
        @click="toggleFolder(node.path)"
      >
        <span class="icon-toggle">
          <ChevronDown v-if="openFolders.has(node.path)" :size="12" />
          <ChevronRight v-else :size="12" />
        </span>
        <FolderOpen v-if="openFolders.has(node.path)" :size="14" class="folder-icon" />
        <Folder v-else :size="14" class="folder-icon" />
        <span class="node-name">{{ node.name }}</span>
      </div>

      <div
        v-else
        class="tree-row file"
        :style="{ paddingLeft: `${(level || 0) * 12 + 20}px` }"
        :title="node.path"
      >
        <component :is="getFileIcon(node.name)" :size="13" class="file-icon" />
        <span class="node-name">{{ node.name }}</span>
      </div>

      <FileTreeItem
        v-if="node.type === 'directory' && openFolders.has(node.path) && node.children"
        :nodes="node.children"
        :level="(level || 0) + 1"
      />
    </li>
  </ul>
</template>

<style scoped>
.tree-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-family: var(--font-mono);
  font-size: 11px;
}

.tree-item {
  display: flex;
  flex-direction: column;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding-right: 8px;
  cursor: pointer;
  color: var(--text-dim);
  border-radius: var(--radius);
  user-select: none;
}

.tree-row:hover {
  background-color: var(--raised);
  color: var(--text);
}

.icon-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  color: var(--text-dim);
}

.folder-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.file-icon {
  color: var(--text-dim);
  flex-shrink: 0;
}

.node-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

