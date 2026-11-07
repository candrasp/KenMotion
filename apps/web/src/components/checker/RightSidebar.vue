<script setup lang="ts">
import { ref } from 'vue';
import { TriangleAlert, Sliders, MessageSquare } from 'lucide-vue-next';
import SlopCheckerPanel from './SlopCheckerPanel.vue';
import InspectorFixesPanel from './InspectorFixesPanel.vue';
import ChatPanel from '../chat/ChatPanel.vue';

const activeTab = ref<'checker' | 'inspector' | 'chat'>('chat');
</script>

<template>
  <aside class="right-sidebar">
    <div class="sidebar-tabs">
      <button
        @click="activeTab = 'chat'"
        class="tab-btn"
        :class="{ active: activeTab === 'chat' }"
      >
        <MessageSquare :size="13" />
        <span>Chat</span>
      </button>
      <button
        @click="activeTab = 'checker'"
        class="tab-btn"
        :class="{ active: activeTab === 'checker' }"
      >
        <TriangleAlert :size="13" />
        <span>Pemeriksa</span>
      </button>
      <button
        @click="activeTab = 'inspector'"
        class="tab-btn"
        :class="{ active: activeTab === 'inspector' }"
      >
        <Sliders :size="13" />
        <span>Inspector</span>
      </button>
    </div>

    <div class="sidebar-body">
      <ChatPanel v-show="activeTab === 'chat'" />
      <SlopCheckerPanel v-show="activeTab === 'checker'" />
      <InspectorFixesPanel v-show="activeTab === 'inspector'" />
    </div>
  </aside>
</template>

<style scoped>
.right-sidebar {
  width: 340px;
  background-color: var(--panel);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
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

.sidebar-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}
</style>
