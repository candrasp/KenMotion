<script setup lang="ts">
import { useSafeArea, type PlatformPreset } from '../../composables/useSafeArea';

const { showOverlay, activePreset, presets, toggleOverlay, setPreset } = useSafeArea();

const presetKeys: PlatformPreset[] = ['universal', 'tiktok', 'shorts', 'reels'];
</script>

<template>
  <div class="safe-area-panel">
    <!-- Toggle Master Switch -->
    <div class="panel-row" @click="toggleOverlay">
      <span class="label">Tampilkan Safe Area</span>
      <input
        type="checkbox"
        :checked="showOverlay"
        @click.stop
        @change="toggleOverlay"
        class="toggle-checkbox"
      />
    </div>

    <!-- Daftar Pilihan Platform -->
    <div class="preset-list">
      <div
        v-for="key in presetKeys"
        :key="key"
        class="preset-item"
        :class="{ active: activePreset === key }"
        @click="setPreset(key)"
      >
        <div class="preset-header">
          <span class="preset-name">{{ presets[key].label }}</span>
          <span v-if="activePreset === key" class="badge">Aktif</span>
        </div>
        <div class="specs-grid">
          <span class="spec-cell">T: {{ presets[key].top }}</span>
          <span class="spec-cell">B: {{ presets[key].bottom }}</span>
          <span class="spec-cell">L: {{ presets[key].left }}</span>
          <span class="spec-cell">R: {{ presets[key].right }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.safe-area-panel {
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  gap: 8px;
  font-family: var(--font-ui);
}

.panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background-color: var(--raised);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  user-select: none;
}

.label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
}

.toggle-checkbox {
  accent-color: var(--accent);
  cursor: pointer;
  width: 14px;
  height: 14px;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 10px;
  background-color: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.preset-item:hover {
  background-color: var(--raised);
  border-color: var(--border-strong);
}

.preset-item.active {
  background-color: var(--raised);
  border-color: var(--accent);
}

.preset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preset-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
}

.preset-item.active .preset-name {
  color: var(--accent);
}

.badge {
  font-size: 9px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.specs-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
}

.spec-cell {
  white-space: nowrap;
}
</style>
