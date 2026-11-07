<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePlayer } from '../../composables/usePlayer';
import { useAudio } from '../../composables/useAudio';
import type { StoryboardScene, AudioCue } from '../../lib/types';

const {
  currentTime,
  duration,
  scenes,
  seekTo
} = usePlayer();

const { manifest } = useAudio();

const scrollContainerRef = ref<HTMLDivElement | null>(null);
const trackRef = ref<HTMLDivElement | null>(null);

const handleWheel = (e: WheelEvent): void => {
  if (!scrollContainerRef.value) return;
  // Jika mouse scroll vertikal tanpa Shift, ubah jadi horizontal scroll
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    scrollContainerRef.value.scrollLeft += e.deltaY;
    e.preventDefault();
  }
};

const playheadPercent = computed(() => {
  if (duration.value <= 0) return 0;
  return (currentTime.value / duration.value) * 100;
});

// Time ticks for ruler (interval per 5s or 10s depending on duration)
const timeTicks = computed(() => {
  if (duration.value <= 0) return [];
  const step = duration.value > 90 ? 15 : duration.value > 45 ? 10 : 5;
  const ticks: { time: number; left: number; label: string }[] = [];
  for (let t = 0; t <= duration.value; t += step) {
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    const label = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    ticks.push({
      time: t,
      left: (t / duration.value) * 100,
      label
    });
  }
  return ticks;
});

const getSceneStyle = (scene: StoryboardScene) => {
  if (duration.value <= 0) return { left: '0%', width: '0%' };
  const left = (scene.start / duration.value) * 100;
  const width = ((scene.end - scene.start) / duration.value) * 100;
  return {
    left: `${left}%`,
    width: `${width}%`
  };
};

const getCueLeft = (cue: AudioCue): string => {
  if (duration.value <= 0 || cue.absoluteTime === undefined) return '0%';
  return `${(cue.absoluteTime / duration.value) * 100}%`;
};

const isSceneActive = (scene: StoryboardScene): boolean => {
  return currentTime.value >= scene.start && currentTime.value < scene.end;
};

const handleTrackClick = (e: MouseEvent): void => {
  if (!trackRef.value) return;
  const rect = trackRef.value.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  seekTo(ratio * duration.value);
};

let isDragging = false;

const onMouseDown = (e: MouseEvent): void => {
  isDragging = true;
  handleTrackClick(e);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

const onMouseMove = (e: MouseEvent): void => {
  if (!isDragging) return;
  handleTrackClick(e);
};

const onMouseUp = (): void => {
  isDragging = false;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
};
</script>

<template>
  <div class="timeline-container">
    <!-- Tracks Label List -->
    <div class="track-headers">
      <div class="header-row ruler-header">
        <span class="track-title">TIME</span>
      </div>
      <div class="header-row scene-header">
        <span class="track-title">SCENE</span>
      </div>
      <div class="header-row audio-header">
        <span class="track-title">AUDIO</span>
      </div>
    </div>

    <!-- Timeline Tracks Content with Horizontal Scroll -->
    <div
      class="track-scroll-wrapper"
      ref="scrollContainerRef"
      @wheel="handleWheel"
    >
      <div class="track-body" ref="trackRef" @mousedown="onMouseDown">
        <!-- Time Ruler Row -->
        <div class="track-row ruler-row">
          <div
            v-for="tick in timeTicks"
            :key="tick.time"
            class="ruler-tick"
            :style="{ left: `${tick.left}%` }"
          >
            <div class="tick-line"></div>
            <span class="tick-label">{{ tick.label }}</span>
          </div>
        </div>

        <!-- Visual Scenes Layer -->
        <div class="track-row scenes-row">
          <div
            v-for="scene in scenes"
            :key="scene.scene"
            class="scene-block"
            :class="{ active: isSceneActive(scene) }"
            :style="getSceneStyle(scene)"
            @click.stop="seekTo(scene.start)"
            :title="`${scene.scene} (${scene.start.toFixed(1)}s - ${scene.end.toFixed(1)}s)\n${scene.script}`"
          >
            <div class="scene-top">
              <span class="scene-label">{{ scene.scene }}</span>
            </div>
            <span
              v-if="(scene.end - scene.start) >= 2.5"
              class="scene-script"
            >{{ scene.script }}</span>
          </div>
        </div>

        <!-- Audio Layer: Narasi, Musik, SFX Cues -->
        <div class="track-row audio-row">
          <!-- Narasi span -->
          <div v-if="manifest?.hasNarasi" class="audio-clip narasi-clip">
            <span class="audio-clip-text">Voice Over</span>
          </div>
          <!-- Musik span -->
          <div v-if="manifest?.hasMusik" class="audio-clip musik-clip">
            <span class="audio-clip-text">BGM</span>
          </div>
          <!-- SFX Markers (Clean pin & tooltip on hover) -->
          <div
            v-for="(cue, idx) in manifest?.cues"
            :key="idx"
            class="sfx-marker"
            :style="{ left: getCueLeft(cue) }"
            :title="`${cue.file.split('/').pop()} (+${cue.offset}s)`"
            @click.stop="cue.absoluteTime !== undefined && seekTo(cue.absoluteTime)"
          >
            <div class="sfx-pin"></div>
          </div>
        </div>

        <!-- Unified Playhead across all rows -->
        <div
          class="playhead"
          :style="{ left: `${playheadPercent}%` }"
        >
          <div class="playhead-head"></div>
          <div class="playhead-line"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-container {
  display: flex;
  height: 122px;
  background-color: var(--panel);
  border-top: 1px solid var(--border);
  user-select: none;
}

.track-headers {
  width: 70px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  background-color: var(--panel);
  flex-shrink: 0;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
}

.header-row.ruler-header {
  height: 20px;
}

.header-row.scene-header {
  height: 54px;
}

.header-row.audio-header {
  height: 48px;
  border-bottom: none;
}

.track-title {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

.track-scroll-wrapper {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  background-color: var(--bg);
  /* Scrollbar flat modern */
  scrollbar-width: thin;
}

.track-body {
  min-width: calc(100% + 120px);
  margin-right: 120px;
  display: flex;
  flex-direction: column;
  position: relative;
  cursor: pointer;
  background-color: var(--bg);
  height: 100%;
}

.track-row {
  position: relative;
  width: 100%;
}

.ruler-row {
  height: 20px;
  background-color: var(--panel);
  border-bottom: 1px solid var(--border);
}

.ruler-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.tick-line {
  width: 1px;
  height: 5px;
  background-color: var(--border-strong);
}

.tick-label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-dim);
  margin-top: 1px;
}

.scenes-row {
  height: 54px;
  background-color: var(--raised);
  border-bottom: 1px solid var(--border);
}

.scene-block {
  position: absolute;
  top: 0;
  bottom: 0;
  border-right: 1px solid var(--border-strong);
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  background-color: rgba(255, 255, 255, 0.02);
  transition: background-color 120ms ease;
}

.scene-block:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.scene-block.active {
  background-color: var(--accent-dim);
  border-right-color: var(--accent);
}

.scene-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--text);
}

.scene-script {
  font-size: 10px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.audio-row {
  height: 48px;
  position: relative;
  background-color: var(--panel);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0;
}

.audio-clip {
  position: absolute;
  left: 0;
  right: 0;
  height: 18px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  border-radius: var(--radius);
  font-size: 10px;
  opacity: 0.85;
}

.narasi-clip {
  top: 4px;
  background-color: rgba(91, 141, 239, 0.2);
  border: 1px solid rgba(91, 141, 239, 0.4);
  color: var(--text);
}

.musik-clip {
  top: 24px;
  background-color: rgba(76, 175, 125, 0.15);
  border: 1px solid rgba(76, 175, 125, 0.3);
  color: var(--text);
}

.audio-clip-text {
  font-size: 10px;
  font-weight: 500;
}

.sfx-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  cursor: pointer;
  padding: 0 4px;
}

.sfx-pin {
  width: 5px;
  height: 14px;
  border-radius: 1px;
  background-color: var(--warn);
  opacity: 0.85;
  transition: transform 100ms ease, opacity 100ms ease;
}

.sfx-marker:hover .sfx-pin {
  transform: scaleY(1.4);
  opacity: 1;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  pointer-events: none;
  z-index: 20;
  transform: translateX(-50%);
}

.playhead-head {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 9px;
  height: 9px;
  background-color: var(--accent);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

.playhead-line {
  position: absolute;
  top: 9px;
  bottom: 0;
  left: 50%;
  width: 1.5px;
  background-color: var(--accent);
  transform: translateX(-50%);
}
</style>
