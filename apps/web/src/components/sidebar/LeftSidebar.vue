<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Layers, RefreshCw, ShieldCheck } from 'lucide-vue-next';
import { usePlayer } from '../../composables/usePlayer';
import type { FileNode } from '../../lib/types';
import FileTreeItem from './FileTreeItem.vue';
import ConfirmSwitchModal from './ConfirmSwitchModal.vue';
import ProjectSelectorDropdown from './ProjectSelectorDropdown.vue';
import SafeAreaPanel from './SafeAreaPanel.vue';

const { currentProjectId } = usePlayer();

const emit = defineEmits<{
  (e: 'switch-project', projectId: string): void;
}>();

type LeftTab = 'files' | 'safe-area';
const activeTab = ref<LeftTab>('files');
const fileTree = ref<FileNode[]>([]);
const isLoadingTree = ref<boolean>(false);
const pendingProjectId = ref<string | null>(null);
const showConfirmModal = ref<boolean>(false);

const loadTree = async (projectId: string): Promise<void> => {
  if (!projectId) return;
  isLoadingTree.value = true;
  try {
    const res = await fetch(`/projects/${projectId}/tree`);
    if (res.ok) {
      const data = await res.json() as { tree: FileNode[] };
      fileTree.value = data.tree || [];
    }
  } catch (err) {
    console.warn('Gagal memuat struktur file projek:', err);
  } finally {
    isLoadingTree.value = false;
  }
};

const handleSelectProject = (projectId: string): void => {
  if (projectId === currentProjectId.value) return;
  pendingProjectId.value = projectId;
  showConfirmModal.value = true;
};

const confirmSwitch = (): void => {
  if (pendingProjectId.value) {
    emit('switch-project', pendingProjectId.value);
  }
  showConfirmModal.value = false;
  pendingProjectId.value = null;
};

const cancelSwitch = (): void => {
  showConfirmModal.value = false;
  pendingProjectId.value = null;
};

watch(currentProjectId, (newId) => loadTree(newId));
onMounted(() => loadTree(currentProjectId.value));
</script>

<template>
  <aside class="left-sidebar">
    <div class="sidebar-header">
      <div class="header-label">PROJEK AKTIF</div>
      <ProjectSelectorDropdown @select="handleSelectProject" />
    </div>

    <div class="sidebar-tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'files' }"
        @click="activeTab = 'files'"
      >
        <Layers :size="13" />
        <span>File</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'safe-area' }"
        @click="activeTab = 'safe-area'"
      >
        <ShieldCheck :size="13" />
        <span>Safe Area</span>
      </button>
    </div>

    <div v-show="activeTab === 'files'" class="sidebar-body">
      <div class="tree-header">
        <span class="tree-title">
          <Layers :size="13" />
          <span>STRUKTUR FILE</span>
        </span>
        <button
          class="refresh-btn"
          @click="loadTree(currentProjectId)"
          title="Segarkan Struktur"
          :disabled="isLoadingTree"
        >
          <RefreshCw :size="12" :class="{ spin: isLoadingTree }" />
        </button>
      </div>

      <div class="tree-container">
        <div v-if="isLoadingTree" class="tree-empty">Memuat...</div>
        <FileTreeItem v-else-if="fileTree.length > 0" :nodes="fileTree" />
        <div v-else class="tree-empty">Tidak ada file</div>
      </div>
    </div>

    <div v-show="activeTab === 'safe-area'" class="sidebar-body">
      <SafeAreaPanel />
    </div>

    <ConfirmSwitchModal
      v-if="showConfirmModal && pendingProjectId"
      :target-project-id="pendingProjectId"
      @confirm="confirmSwitch"
      @cancel="cancelSwitch"
    />
  </aside>
</template>

<style scoped>
.left-sidebar {
  width: 220px;
  background-color: var(--panel);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  position: relative;
  user-select: none;
}

.sidebar-header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.sidebar-tabs {
  height: 38px;
  display: flex;
  border-bottom: 1px solid var(--border);
  background-color: var(--bg);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  border-bottom: 2px solid transparent;
  transition: all 120ms ease;
  cursor: pointer;
}

.tab-btn:hover {
  color: var(--text);
  background-color: rgba(255, 255, 255, 0.02);
}

.tab-btn.active {
  color: var(--text);
  background-color: var(--panel);
  border-bottom: 2px solid var(--accent);
}

.header-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.sidebar-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.tree-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.05em;
}

.refresh-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  padding: 2px;
  display: inline-flex;
}

.refresh-btn:hover {
  color: var(--text);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.tree-container {
  flex: 1;
  padding: 8px 6px;
  overflow-y: auto;
}

.tree-empty {
  font-size: 11px;
  color: var(--text-dim);
  padding: 8px;
  text-align: center;
}
</style>
