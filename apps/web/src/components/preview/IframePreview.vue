<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import {
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-vue-next';
import { usePlayer } from '../../composables/usePlayer';
import { useFixes } from '../../composables/useFixes';
import { useAudio } from '../../composables/useAudio';
import { usePreviewZoom } from '../../composables/usePreviewZoom';
import { useSafeArea } from '../../composables/useSafeArea';
import PlatformMockupOverlay from './PlatformMockupOverlay.vue';

const { currentProjectId, setIframe, onIframeLoaded, previewReloadKey } = usePlayer();
const { applyFixesToIframe } = useFixes();
const { volume, isMuted, setVolume, toggleMute } = useAudio();
const { showOverlay, activePreset, presets } = useSafeArea();
const currentSafeArea = computed(() => presets[activePreset.value]);
const {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  containerRef,
  zoomMultiplier,
  panX,
  panY,
  isDragging,
  isFullscreen,
  effectiveScale,
  zoomPercent,
  updateScale,
  zoomIn,
  zoomOut,
  resetZoom,
  handleWheel,
  startDrag,
  toggleFullscreen,
  handleFullscreenChange,
} = usePreviewZoom();

const iframe = ref<HTMLIFrameElement | null>(null);

const handleIframeLoad = (): void => {
  onIframeLoaded();
  applyFixesToIframe(iframe.value);
  try {
    const win = iframe.value?.contentWindow;
    if (win) {
      win.addEventListener('wheel', (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
        }
      }, { passive: false });
    }
  } catch {}
};

const onVolumeInput = (e: Event): void => {
  const target = e.target as HTMLInputElement;
  setVolume(parseFloat(target.value));
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (iframe.value) setIframe(iframe.value);
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => updateScale());
    resizeObserver.observe(containerRef.value);
    containerRef.value.addEventListener('wheel', handleWheel, { passive: false });
    updateScale();
  }
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (containerRef.value) containerRef.value.removeEventListener('wheel', handleWheel);
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  setIframe(null);
});

const iframeSrc = computed(() => `/projects/${currentProjectId.value}/index.html?render=1&v=${previewReloadKey.value}`);
</script>

<template>
  <div
    class="preview-container"
    ref="containerRef"
    @mousedown="startDrag"
    :class="{ 'is-grabbing': isDragging }"
  >
    <!-- Zoom Controls (Kanan Atas) -->
    <div class="control-overlay top-right" @mousedown.stop>
      <button class="overlay-btn" @click="zoomOut" title="Zoom Out" :disabled="zoomMultiplier <= MIN_ZOOM">
        <ZoomOut :size="15" />
      </button>
      <button class="overlay-badge" @click="resetZoom" title="Klik untuk Reset Zoom (Fit)">
        <span class="mono">{{ zoomPercent }}%</span>
        <RotateCcw v-if="zoomMultiplier !== 1 || panX !== 0 || panY !== 0" :size="12" class="reset-icon" />
      </button>
      <button class="overlay-btn" @click="zoomIn" title="Zoom In" :disabled="zoomMultiplier >= MAX_ZOOM">
        <ZoomIn :size="15" />
      </button>
    </div>

    <!-- Media Controls (Kanan Bawah: Volume & Full Wide) -->
    <div class="control-overlay bottom-right" @mousedown.stop>
      <div class="volume-group">
        <button class="overlay-btn" @click="toggleMute" :title="isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'">
          <VolumeX v-if="isMuted || volume === 0" :size="16" />
          <Volume1 v-else-if="volume < 0.5" :size="16" />
          <Volume2 v-else :size="16" />
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="isMuted ? 0 : volume"
          @input="onVolumeInput"
          class="volume-slider"
          title="Volume Preview"
        />
      </div>

      <div class="divider" />

      <button class="overlay-btn" @click="toggleFullscreen" :title="isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Full Wide)'">
        <Minimize2 v-if="isFullscreen" :size="16" />
        <Maximize2 v-else :size="16" />
      </button>
    </div>

    <!-- Iframe Canvas Stage (bisa digeser dengan Pan) -->
    <div
      class="stage-wrapper"
      :style="{
        width: `${STAGE_WIDTH}px`,
        height: `${STAGE_HEIGHT}px`,
        transform: `translate(${panX}px, ${panY}px) scale(${effectiveScale})`
      }"
    >
      <iframe
        ref="iframe"
        :src="iframeSrc"
        @load="handleIframeLoad"
        class="stage-frame"
      />

      <!-- Visual Safe Area Overlay: Mockup UI HP asli + garis panduan -->
      <template v-if="showOverlay">
        <PlatformMockupOverlay :preset="activePreset" />
        <div class="safe-area-overlay">
          <div
            class="safe-guide-box"
            :style="{
              top: `${currentSafeArea.top}px`,
              bottom: `${currentSafeArea.bottom}px`,
              left: `${currentSafeArea.left}px`,
              right: `${currentSafeArea.right}px`
            }"
          >
            <div class="safe-guide-label">{{ currentSafeArea.label }}</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg);
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
  cursor: grab;
}

.preview-container.is-grabbing {
  cursor: grabbing;
}

.stage-wrapper {
  transform-origin: center center;
  outline: 1px solid var(--border);
  background-color: var(--bg);
  position: relative;
  flex-shrink: 0;
  image-rendering: auto;
  pointer-events: auto;
}

.stage-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  pointer-events: none;
}

.control-overlay {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 2px;
  background: transparent;
  padding: 0;
  opacity: 0.7;
  transition: opacity 0.15s ease;
  cursor: default;
}

.control-overlay:hover {
  opacity: 1;
}

.top-right { top: 14px; right: 14px; }
.bottom-right { bottom: 14px; right: 14px; }
.overlay-btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; background: transparent; border: none; color: var(--text-dim); cursor: pointer; }
.overlay-btn:hover:not(:disabled) { color: var(--text); }
.overlay-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.overlay-badge { display: inline-flex; align-items: center; gap: 3px; height: 26px; padding: 0 4px; background: transparent; border: none; color: var(--text-dim); font-size: 11px; cursor: pointer; }
.overlay-badge:hover { color: var(--text); }
.reset-icon { color: var(--accent); }

.volume-group { display: flex; align-items: center; position: relative; }
.volume-slider {
  -webkit-appearance: none; appearance: none;
  width: 0; opacity: 0; height: 2px;
  background: var(--border-strong); border-radius: 1px; outline: none; cursor: pointer;
  transition: width 0.18s ease, opacity 0.18s ease, margin 0.18s ease; margin-left: 0;
}
.volume-group:hover .volume-slider, .volume-slider:focus {
  width: 48px; opacity: 1; margin-left: 4px; margin-right: 2px;
}
.volume-slider::-webkit-slider-runnable-track { height: 2px; background: var(--border-strong); border-radius: 1px; }
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--text-dim); cursor: pointer; margin-top: -3px;
  transition: background 0.12s ease, transform 0.12s ease;
}
.volume-slider::-webkit-slider-thumb:hover { background: var(--text); transform: scale(1.2); }
.volume-slider::-moz-range-track { height: 2px; background: var(--border-strong); border-radius: 1px; }
.volume-slider::-moz-range-thumb { width: 8px; height: 8px; border: none; border-radius: 50%; background: var(--text-dim); cursor: pointer; }
.divider { width: 1px; height: 12px; background-color: var(--border-strong); margin: 0 4px; }

/* Safe Area Overlay */
.safe-area-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.safe-guide-box {
  position: absolute;
  border: 2px dashed rgba(91, 141, 239, 0.7);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 10px 14px;
}

.safe-guide-label {
  background-color: var(--panel);
  border: 1px solid var(--border-strong);
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 2px 8px;
  border-radius: var(--radius);
  text-transform: uppercase;
  font-family: var(--font-mono);
}
</style>
