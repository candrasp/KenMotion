<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, Trash2, SlidersHorizontal, RotateCcw } from 'lucide-vue-next';
import { useFixes } from '../../composables/useFixes';
import { usePlayer } from '../../composables/usePlayer';
import type { StyleOverride } from '../../lib/types';

const { currentProjectId, currentTime, scenes } = usePlayer();
const { fixes, isSaving, saveFixes } = useFixes();

const activeScene = computed(() => {
  return scenes.value.find((s) => currentTime.value >= s.start && currentTime.value < s.end)
    || scenes.value.find((s) => currentTime.value <= s.end)
    || null;
});

const currentSceneFixes = computed(() => {
  if (!activeScene.value) return [];
  return fixes.value.filter((f) => f.scene === activeScene.value?.scene);
});

// Form state
const newSelector = ref<string>('[data-script]');
const newTop = ref<string>('');
const newLeft = ref<string>('');
const newFontSize = ref<string>('');
const newText = ref<string>('');

// Presets selector sesuai SPEC.md
const selectorPresets = [
  { label: 'data-script', val: '[data-script]' },
  { label: 'title', val: '[data-role="title"]' },
  { label: 'caption', val: '[data-role="caption"]' },
  { label: 'header', val: '#hd' },
];

const resetForm = (): void => {
  newTop.value = '';
  newLeft.value = '';
  newFontSize.value = '';
  newText.value = '';
};

const addOverride = (): void => {
  if (!activeScene.value || !newSelector.value.trim()) return;

  const styleObj: Record<string, string> = {};
  if (newTop.value.trim()) {
    const v = newTop.value.trim();
    styleObj['top'] = v.endsWith('px') || v.endsWith('%') ? v : `${v}px`;
  }
  if (newLeft.value.trim()) {
    const v = newLeft.value.trim();
    styleObj['left'] = v.endsWith('px') || v.endsWith('%') ? v : `${v}px`;
  }
  if (newFontSize.value.trim()) {
    const v = newFontSize.value.trim();
    styleObj['fontSize'] = v.endsWith('px') || v.endsWith('rem') ? v : `${v}px`;
  }

  const textVal = newText.value.trim();
  if (Object.keys(styleObj).length === 0 && !textVal) return;

  const overrideItem: StyleOverride = {
    scene: activeScene.value.scene,
    selector: newSelector.value.trim(),
    style: styleObj,
    text: textVal || undefined,
  };

  fixes.value.push(overrideItem);
  saveFixes(currentProjectId.value);
  resetForm();
};

const removeOverride = (item: StyleOverride): void => {
  const globalIdx = fixes.value.indexOf(item);
  if (globalIdx !== -1) {
    fixes.value.splice(globalIdx, 1);
    saveFixes(currentProjectId.value);
  }
};
</script>

<template>
  <div class="inspector-panel">
    <!-- Header Scene Status -->
    <div class="scene-header">
      <div class="scene-meta">
        <SlidersHorizontal :size="12" class="scene-icon" />
        <span v-if="activeScene" class="scene-name mono">Scene {{ activeScene.scene }}</span>
        <span v-else class="scene-name">Tidak ada scene</span>
        <span v-if="activeScene" class="scene-time mono">({{ activeScene.start.toFixed(1) }}s)</span>
      </div>
      <span v-if="activeScene" class="badge-count mono">
        {{ currentSceneFixes.length }} override
      </span>
    </div>

    <div class="inspector-scroll">
      <div v-if="!activeScene" class="empty-scene">
        <p>Pilih scene di timeline untuk mengatur override.</p>
      </div>

      <div v-else class="inspector-content">
        <!-- Target Selector Section -->
        <div class="section-group">
          <div class="section-label">TARGET ELEMEN</div>
          <input
            v-model="newSelector"
            class="prop-input mono"
            placeholder="Selector (mis. [data-script])"
          />
          <div class="preset-row">
            <button
              v-for="p in selectorPresets"
              :key="p.val"
              type="button"
              @click="newSelector = p.val"
              class="preset-tag mono"
              :class="{ active: newSelector === p.val }"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <!-- Position & Size Section -->
        <div class="section-group">
          <div class="section-label">POSISI & UKURAN</div>
          <div class="grid-2">
            <div class="prop-field">
              <span class="field-label">Top (Y)</span>
              <div class="input-with-unit">
                <input
                  v-model="newTop"
                  class="prop-input mono"
                  placeholder="1380"
                />
                <span class="unit-label">px</span>
              </div>
            </div>

            <div class="prop-field">
              <span class="field-label">Left (X)</span>
              <div class="input-with-unit">
                <input
                  v-model="newLeft"
                  class="prop-input mono"
                  placeholder="80"
                />
                <span class="unit-label">px</span>
              </div>
            </div>
          </div>

          <div class="prop-field mt-2">
            <span class="field-label">Font Size</span>
            <div class="input-with-unit">
              <input
                v-model="newFontSize"
                class="prop-input mono"
                placeholder="48"
              />
              <span class="unit-label">px</span>
            </div>
          </div>
        </div>

        <!-- Text Correction Section -->
        <div class="section-group">
          <div class="section-label">KOREKSI TEKS (OPSIONAL)</div>
          <textarea
            v-model="newText"
            class="prop-textarea"
            placeholder="Teks naskah pengganti..."
            rows="2"
          />
        </div>

        <!-- Action Buttons -->
        <div class="form-actions">
          <button
            type="button"
            @click="resetForm"
            class="btn-reset"
            title="Kosongkan input form"
          >
            <RotateCcw :size="11" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            @click="addOverride"
            :disabled="isSaving"
            class="btn-save"
          >
            <Plus :size="12" />
            <span>{{ isSaving ? 'Menyimpan...' : 'Terapkan Override' }}</span>
          </button>
        </div>

        <!-- Active Overrides Section -->
        <div class="section-group mt-3">
          <div class="section-header-split">
            <span class="section-label mb-0">OVERRIDE AKTIF</span>
            <span class="badge-count-sm mono">{{ currentSceneFixes.length }}</span>
          </div>

          <div v-if="currentSceneFixes.length === 0" class="empty-card">
            <span>Belum ada override di scene ini.</span>
          </div>

          <div v-else class="fixes-stack">
            <div
              v-for="(fix, idx) in currentSceneFixes"
              :key="idx"
              class="fix-card"
            >
              <div class="fix-header">
                <span class="fix-selector mono">{{ fix.selector }}</span>
                <button
                  type="button"
                  @click="removeOverride(fix)"
                  class="btn-trash"
                  title="Hapus override"
                >
                  <Trash2 :size="11" />
                </button>
              </div>

              <div v-if="fix.style && Object.keys(fix.style).length > 0" class="fix-props">
                <span
                  v-for="(val, prop) in fix.style"
                  :key="prop"
                  class="fix-prop-badge mono"
                >
                  <span class="prop-key">{{ prop }}:</span> {{ val }}
                </span>
              </div>

              <div v-if="fix.text" class="fix-text-box">
                <span class="text-prefix">Teks:</span>
                <span class="text-content">"{{ fix.text }}"</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inspector-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--panel);
}

.scene-header {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
  flex-shrink: 0;
}

.scene-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.scene-icon {
  color: var(--accent);
}

.scene-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
}

.scene-time {
  font-size: 11px;
  color: var(--text-dim);
}

.badge-count {
  font-size: 10px;
  background: var(--raised);
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 1px 6px;
  border-radius: var(--radius);
}

.inspector-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-scene {
  text-align: center;
  padding: 36px 12px;
  color: var(--text-dim);
  font-size: 11px;
}

.inspector-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-dim);
}

.section-header-split {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.mb-0 { margin-bottom: 0; }
.mt-2 { margin-top: 6px; }
.mt-3 { margin-top: 10px; }

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.preset-tag {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.12s ease;
}

.preset-tag:hover,
.preset-tag.active {
  background: var(--raised);
  border-color: var(--accent);
  color: var(--text);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.prop-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.field-label {
  font-size: 10px;
  color: var(--text-dim);
}

.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.input-with-unit .prop-input {
  padding-right: 24px;
}

.unit-label {
  position: absolute;
  right: 8px;
  font-size: 10px;
  color: var(--text-dim);
  pointer-events: none;
  font-family: var(--font-mono);
}

.prop-input {
  width: 100%;
  min-width: 0;
  height: 26px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 11px;
  padding: 0 8px;
  outline: none;
  transition: border-color 0.12s ease;
}

.prop-input:focus,
.prop-textarea:focus {
  border-color: var(--accent);
}

.prop-textarea {
  width: 100%;
  min-width: 0;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 11px;
  padding: 6px 8px;
  outline: none;
  resize: none;
  line-height: 1.4;
  font-family: inherit;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.btn-reset {
  height: 26px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: var(--radius);
  font-size: 10px;
  padding: 0 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s ease;
}

.btn-reset:hover {
  background: var(--raised);
  color: var(--text);
  border-color: var(--border-strong);
}

.btn-save {
  height: 26px;
  background: var(--raised);
  border: 1px solid var(--accent);
  color: var(--text);
  border-radius: var(--radius);
  font-size: 11px;
  font-weight: 500;
  padding: 0 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.12s ease;
}

.btn-save:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
}

.btn-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.badge-count-sm {
  font-size: 9px;
  background: var(--raised);
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 0 4px;
  border-radius: var(--radius);
}

.empty-card {
  font-size: 11px;
  color: var(--text-dim);
  padding: 12px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  text-align: center;
}

.fixes-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fix-card {
  background: var(--raised);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fix-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fix-selector {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
}

.btn-trash {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-dim);
  border-radius: var(--radius);
  cursor: pointer;
  padding: 0;
  transition: all 0.12s ease;
}

.btn-trash:hover {
  color: var(--danger);
  background: var(--bg);
}

.fix-props {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.fix-prop-badge {
  font-size: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 1px 4px;
  border-radius: var(--radius);
}

.prop-key {
  color: var(--text-dim);
}

.fix-text-box {
  font-size: 10px;
  display: flex;
  gap: 4px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-prefix {
  color: var(--text-dim);
}

.text-content {
  color: var(--text);
}
</style>
