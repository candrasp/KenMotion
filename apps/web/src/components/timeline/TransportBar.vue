<script setup lang="ts">
import { computed } from 'vue';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { usePlayer } from '../../composables/usePlayer';

const {
  currentTime,
  duration,
  isPlaying,
  togglePlay,
  jumpPrevScene,
  jumpNextScene,
  stepFrame
} = usePlayer();

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const ff = String(frames).padStart(2, '0');
  return `${mm}:${ss}.${ff}`;
};

const formattedCurrent = computed(() => formatTime(currentTime.value));
const formattedDuration = computed(() => formatTime(duration.value));
</script>

<template>
  <div class="transport-bar">
    <div class="left-section">
      <div class="control-group">
        <button @click="jumpPrevScene" title="Scene Sebelumnya (Alt+Left)">
          <SkipBack :size="15" />
        </button>
        <button @click="stepFrame(false)" title="1 Frame Mundur (Left)">
          <ChevronLeft :size="15" />
        </button>
        <button @click="togglePlay" class="play-btn" :class="{ active: isPlaying }" title="Spasi">
          <Pause v-if="isPlaying" :size="16" />
          <Play v-else :size="16" />
        </button>
        <button @click="stepFrame(true)" title="1 Frame Maju (Right)">
          <ChevronRight :size="15" />
        </button>
        <button @click="jumpNextScene" title="Scene Berikutnya (Alt+Right)">
          <SkipForward :size="15" />
        </button>
      </div>

      <div class="time-display mono">
        <span class="current">{{ formattedCurrent }}</span>
        <span class="separator">/</span>
        <span class="total">{{ formattedDuration }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transport-bar {
  display: flex;
  align-items: center;
  padding: 0 12px;
  background-color: var(--panel);
  border-top: 1px solid var(--border);
  height: 38px;
  flex-shrink: 0;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.play-btn {
  width: 32px;
  height: 26px;
  background-color: var(--raised);
}

.play-btn.active {
  background-color: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.time-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.time-display .current {
  color: var(--text);
  font-weight: 500;
}

.time-display .separator {
  color: var(--text-dim);
}

.time-display .total {
  color: var(--text-dim);
}
</style>
