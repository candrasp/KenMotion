<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { PanelLeft } from 'lucide-vue-next';
import { usePlayer, PROJECT_STORAGE_KEY } from './composables/usePlayer';
import IframePreview from './components/preview/IframePreview.vue';
import TransportBar from './components/timeline/TransportBar.vue';
import TimelineTrack from './components/timeline/TimelineTrack.vue';
import LeftSidebar from './components/sidebar/LeftSidebar.vue';
import RightSidebar from './components/checker/RightSidebar.vue';
import RenderPanel from './components/render/RenderPanel.vue';
import { useAudio } from './composables/useAudio';
import { useFixes } from './composables/useFixes';
import type { StoryboardScene } from './lib/types';

const { loadAudioManifest } = useAudio();
const { loadFixes } = useFixes();

const {
  currentProjectId,
  projects,
  scenes,
  duration,
  currentTime,
  togglePlay,
  stepFrame,
  jumpPrevScene,
  jumpNextScene,
  refreshProjects,
} = usePlayer();

const isLeftSidebarOpen = ref<boolean>(true);

const toggleLeftSidebar = (): void => {
  isLeftSidebarOpen.value = !isLeftSidebarOpen.value;
};

const syncProjectUrl = (projectId: string): void => {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('project') !== projectId) {
      url.searchParams.set('project', projectId);
      window.history.replaceState(null, '', url.toString());
    }
    localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
  } catch {}
};

const fetchStoryboard = async (projectId: string): Promise<void> => {
  try {
    currentProjectId.value = projectId;
    currentTime.value = 0;
    syncProjectUrl(projectId);
    await loadAudioManifest(projectId);
    await loadFixes(projectId);
    const res = await fetch(`/projects/${projectId}/storyboard`);
    if (res.ok) {
      const data = await res.json() as { raw: string; scenes: StoryboardScene[] };
      scenes.value = data.scenes;
      if (data.scenes.length > 0) {
        const lastScene = data.scenes[data.scenes.length - 1];
        duration.value = lastScene.end;
      } else {
        duration.value = 10;
      }
    }
  } catch (err) {
    console.error('Failed to load storyboard:', err);
  }
};

const handleKeydown = (e: KeyboardEvent): void => {
  // Cegah browser page zoom global (Ctrl + Plus, Ctrl + Minus, Ctrl + 0)
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_' || e.key === '0' ||
     e.code === 'NumpadAdd' || e.code === 'NumpadSubtract' || e.code === 'Equal' || e.code === 'Minus' || e.code === 'Digit0' || e.code === 'Numpad0')
  ) {
    e.preventDefault();
  }

  // Shortcut CTRL + B (atau Cmd + B) untuk toggle sidebar kiri
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault();
    toggleLeftSidebar();
    return;
  }

  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    if (e.altKey) {
      jumpPrevScene();
    } else {
      stepFrame(false);
    }
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    if (e.altKey) {
      jumpNextScene();
    } else {
      stepFrame(true);
    }
  }
};

const handleGlobalWheel = (e: WheelEvent): void => {
  // Matikan browser page zoom dari Ctrl + Mouse Wheel di seluruh window
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
  }
};

const handlePopState = (): void => {
  const urlParam = new URLSearchParams(window.location.search).get('project');
  if (urlParam && urlParam !== currentProjectId.value && projects.value.some((p) => p.id === urlParam)) {
    void fetchStoryboard(urlParam);
  }
};

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown, { capture: true });
  document.addEventListener('wheel', handleGlobalWheel, { passive: false, capture: true });
  window.addEventListener('wheel', handleGlobalWheel, { passive: false, capture: true });
  window.addEventListener('popstate', handlePopState);

  await refreshProjects();

  // Validasi kandidat projek: URL -> LocalStorage -> projek pertama
  let targetId: string | null = null;
  const urlParam = new URLSearchParams(window.location.search).get('project');
  const storedId = localStorage.getItem(PROJECT_STORAGE_KEY);

  if (urlParam && projects.value.some((p) => p.id === urlParam)) {
    targetId = urlParam;
  } else if (storedId && projects.value.some((p) => p.id === storedId)) {
    targetId = storedId;
  } else if (projects.value.length > 0) {
    targetId = projects.value[0].id;
  }

  // Jika projek di localStorage ternyata sudah tidak ada di disk, bersihkan
  if (storedId && !projects.value.some((p) => p.id === storedId)) {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  }

  if (targetId) {
    await fetchStoryboard(targetId);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown, { capture: true });
  document.removeEventListener('wheel', handleGlobalWheel);
  window.removeEventListener('wheel', handleGlobalWheel);
  window.removeEventListener('popstate', handlePopState);
});
</script>

<template>
  <div class="app-shell">
    <div class="workspace-layout">
      <header class="top-bar">
        <div class="left-section">
          <button
            class="sidebar-toggle-btn"
            :class="{ active: isLeftSidebarOpen }"
            @click="toggleLeftSidebar"
            title="Toggle Sidebar Kiri (Ctrl+B)"
          >
            <PanelLeft :size="16" />
          </button>
          <div class="logo">
            <img src="/favicon.ico" alt="KenMotion" class="logo-icon" />
            <span class="logo-text">KenMotion</span>
          </div>
        </div>

        <div class="right-section">
          <RenderPanel />
        </div>
      </header>

      <main class="main-content">
        <LeftSidebar
          v-if="isLeftSidebarOpen"
          @switch-project="fetchStoryboard"
        />
        <div class="center-content">
          <IframePreview />
          <TransportBar />
        </div>
      </main>

      <footer class="bottom-panel">
        <TimelineTrack />
      </footer>
    </div>

    <RightSidebar />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg);
  color: var(--text);
  overflow: hidden;
}

.workspace-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  background-color: var(--panel);
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
  flex-shrink: 0;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-dim);
  border-radius: var(--radius);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.sidebar-toggle-btn:hover {
  color: var(--text);
  background-color: var(--raised);
  border-color: var(--border);
}

.sidebar-toggle-btn.active {
  color: var(--accent);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.logo-text {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.05em;
  color: var(--text);
}

.logo-sub {
  font-size: 11px;
  color: var(--text-dim);
}

.main-content {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.center-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.bottom-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 100%;
}
</style>
