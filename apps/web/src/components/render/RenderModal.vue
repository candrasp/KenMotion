<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { Film, Square, CheckCircle2, AlertCircle, X, Clock, Check } from 'lucide-vue-next';
import { useRender } from '../../composables/useRender';
import { usePlayer } from '../../composables/usePlayer';
import type { RenderProgress } from '../../lib/types';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const { currentProjectId, duration } = usePlayer();
const { startRender, cancelRender } = useRender();

const FPS_OPTIONS = [24, 30, 60] as const;
const selectedFps = ref<24 | 30 | 60>(30);

const RESOLUTION_OPTIONS = ['720p', '1080p'] as const;
const selectedResolution = ref<'720p' | '1080p'>('1080p');

const progress = ref<RenderProgress | null>(null);
const isRendering = computed(() => progress.value?.status === 'rendering' || progress.value?.status === 'mixing');

const startTime = ref<number>(0);
const elapsedSeconds = ref<number>(0);
let timerInterval: number | null = null;

const formatDuration = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const startTimer = (): void => {
  startTime.value = Date.now();
  elapsedSeconds.value = 0;
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = window.setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startTime.value) / 1000);
  }, 500);
};

const stopTimer = (): void => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const etaText = computed((): string => {
  const p = progress.value;
  if (!p || p.status !== 'rendering' || p.frame <= 8 || elapsedSeconds.value < 2) {
    return 'Menghitung...';
  }
  const fpsActual = p.frame / elapsedSeconds.value;
  if (fpsActual <= 0) return 'Menghitung...';
  const remainingFrames = Math.max(0, p.totalFrames - p.frame);
  const remSec = Math.round(remainingFrames / fpsActual);
  if (remSec < 60) return `~${remSec}s`;
  const remMin = Math.floor(remSec / 60);
  const remSecLeft = remSec % 60;
  return `~${remMin}m ${remSecLeft}s`;
});

const progressPercent = computed((): number => {
  if (!progress.value || progress.value.totalFrames === 0) return 0;
  return Math.min(100, Math.round((progress.value.frame / progress.value.totalFrames) * 100));
});

const estimatedTotalFrames = computed((): number => {
  return Math.ceil(duration.value * selectedFps.value);
});

const handleClose = (): void => {
  if (isRendering.value) return;
  emit('close');
};

const onStartRender = (): void => {
  startTimer();
  progress.value = { status: 'rendering', frame: 0, totalFrames: estimatedTotalFrames.value, fps: selectedFps.value };
  startRender(currentProjectId.value, selectedFps.value, selectedResolution.value, (p) => {
    progress.value = p;
    if (p.status === 'done' || p.status === 'error' || p.status === 'cancelled') {
      stopTimer();
    }
  });
};

const onCancelRender = async (): Promise<void> => {
  stopTimer();
  await cancelRender();
};

onUnmounted(() => {
  stopTimer();
});
</script>

<template>
  <div class="modal-backdrop">
    <div class="render-dialog">
      <!-- Dialog Header -->
      <div class="dialog-header">
        <div class="header-left">
          <Film :size="14" class="header-icon" />
          <span class="header-title">
            {{ isRendering ? 'Merender Video...' : progress?.status === 'done' ? 'Render Selesai' : 'Pengaturan Render' }}
          </span>
        </div>
        <button v-if="!isRendering" @click="handleClose" class="btn-icon-close" title="Tutup">
          <X :size="14" />
        </button>
      </div>

      <!-- State 1: Konfigurasi Render -->
      <div v-if="!progress || progress.status === 'cancelled'" class="dialog-content">
        <!-- Metadata Ringkas Projek -->
        <div class="meta-strip">
          <div class="meta-col">
            <span class="meta-lbl">PROJEK</span>
            <span class="meta-val">{{ currentProjectId }}</span>
          </div>
          <div class="meta-divider" />
          <div class="meta-col">
            <span class="meta-lbl">DURASI</span>
            <span class="meta-val mono">{{ duration.toFixed(1) }}s</span>
          </div>
          <div class="meta-divider" />
          <div class="meta-col">
            <span class="meta-lbl">TOTAL FRAME</span>
            <span class="meta-val mono">{{ estimatedTotalFrames }}</span>
          </div>
        </div>

        <!-- Pilihan Resolusi -->
        <div class="form-section">
          <div class="section-title">RESOLUSI VIDEO (9:16)</div>
          <div class="card-grid">
            <div
              v-for="res in RESOLUTION_OPTIONS"
              :key="res"
              class="res-card"
              :class="{ selected: selectedResolution === res }"
              @click="selectedResolution = res"
            >
              <div class="res-card-head">
                <span class="res-name mono">{{ res }}</span>
                <span class="res-badge">{{ res === '1080p' ? 'Full HD' : 'Cepat' }}</span>
              </div>
              <div class="res-card-dims mono">
                {{ res === '1080p' ? '1080 × 1920' : '720 × 1280' }}
              </div>
              <div v-if="selectedResolution === res" class="check-mark">
                <Check :size="12" />
              </div>
            </div>
          </div>
        </div>

        <!-- Pilihan FPS -->
        <div class="form-section">
          <div class="section-title">FRAME RATE</div>
          <div class="fps-bar">
            <button
              v-for="fps in FPS_OPTIONS"
              :key="fps"
              class="fps-tab mono"
              :class="{ active: selectedFps === fps }"
              @click="selectedFps = fps"
            >
              {{ fps }} FPS
            </button>
          </div>
        </div>

        <!-- Footer Aksi -->
        <div class="dialog-footer">
          <button @click="handleClose" class="btn-cancel">Batal</button>
          <button @click="onStartRender" class="btn-render-primary">Mulai Render</button>
        </div>
      </div>

      <!-- State 2: Rendering Berjalan (Locked) -->
      <div v-else-if="isRendering" class="dialog-content rendering-content">
        <div class="phase-badge">
          <span class="phase-dot" />
          <span>{{ progress.status === 'mixing' ? 'Mixing audio & ducking suara...' : 'Mengambil frame visual & encoding...' }}</span>
        </div>

        <!-- Progress Box -->
        <div class="progress-box">
          <div class="progress-numbers">
            <span class="percent-text mono">{{ progressPercent }}%</span>
            <span class="frame-text mono">{{ progress.frame }} / {{ progress.totalFrames }} frame</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progressPercent}%` }" />
          </div>
        </div>

        <!-- Live Stopwatch & ETA -->
        <div class="timer-grid">
          <div class="timer-item">
            <Clock :size="13" class="timer-icon" />
            <div class="timer-text">
              <span class="timer-caption">WAKTU BERJALAN</span>
              <span class="timer-num mono">{{ formatDuration(elapsedSeconds) }}</span>
            </div>
          </div>
          <div class="timer-item">
            <Clock :size="13" class="timer-icon" />
            <div class="timer-text">
              <span class="timer-caption">ESTIMASI SISA</span>
              <span class="timer-num mono accent">{{ etaText }}</span>
            </div>
          </div>
        </div>

        <div class="lock-caption">
          Layar dikunci agar proses render tidak terganggu oleh perubahan file.
        </div>

        <div class="dialog-footer footer-center">
          <button @click="onCancelRender" class="btn-danger-outline">
            <Square :size="12" />
            <span>Batalkan Render</span>
          </button>
        </div>
      </div>

      <!-- State 3: Selesai Sukses -->
      <div v-else-if="progress.status === 'done'" class="dialog-content done-content">
        <div class="done-icon-wrap">
          <CheckCircle2 :size="32" class="icon-ok" />
        </div>
        <div class="done-title">Render Selesai!</div>
        <div class="done-sub">File video berhasil dibuat di folder <code>out/</code></div>

        <div class="summary-table">
          <div class="summary-row">
            <span class="s-label">Total Waktu</span>
            <span class="s-val mono">{{ formatDuration(elapsedSeconds) }} ({{ elapsedSeconds }} detik)</span>
          </div>
          <div class="summary-row">
            <span class="s-label">Format</span>
            <span class="s-val mono">{{ selectedResolution }} @ {{ selectedFps }} FPS</span>
          </div>
          <div class="summary-row" v-if="progress.outputPath">
            <span class="s-label">Lokasi</span>
            <span class="s-val mono path-val" :title="progress.outputPath">{{ progress.outputPath.split(/[\/\\]/).pop() }}</span>
          </div>
        </div>

        <div class="dialog-footer footer-center">
          <button @click="handleClose" class="btn-render-primary">Tutup</button>
        </div>
      </div>

      <!-- State 4: Error -->
      <div v-else-if="progress.status === 'error'" class="dialog-content done-content">
        <div class="error-icon-wrap">
          <AlertCircle :size="32" class="icon-err" />
        </div>
        <div class="done-title error-text">Render Gagal</div>
        <div class="done-sub">{{ progress.error || 'Terjadi kesalahan' }}</div>
        <div class="dialog-footer footer-center">
          <button @click="handleClose" class="btn-cancel">Tutup</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.render-dialog {
  width: 440px;
  background-color: var(--panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-ui);
}

.dialog-header {
  height: 38px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: var(--accent);
}

.header-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.02em;
}

.btn-icon-close {
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  display: flex;
  padding: 4px;
}
.btn-icon-close:hover { color: var(--text); }

.dialog-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Metadata Strip */
.meta-strip {
  display: flex;
  align-items: center;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
}

.meta-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-lbl {
  font-size: 9px;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  font-weight: 600;
}

.meta-val {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.meta-divider {
  width: 1px;
  height: 22px;
  background-color: var(--border);
  margin: 0 10px;
}

/* Form Sections */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-dim);
}

/* Resolution Cards */
.card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.res-card {
  position: relative;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 120ms ease;
}

.res-card:hover {
  border-color: var(--border-strong);
}

.res-card.selected {
  border-color: var(--accent);
  background-color: var(--raised);
}

.res-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.res-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}
.selected .res-name {
  color: var(--accent);
}

.res-badge {
  font-size: 9px;
  color: var(--text-dim);
  background-color: rgba(255, 255, 255, 0.05);
  padding: 1px 5px;
  border-radius: var(--radius);
}

.res-card-dims {
  font-size: 11px;
  color: var(--text-dim);
}

.check-mark {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--accent);
}

/* FPS Segmented Bar */
.fps-bar {
  display: flex;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2px;
  gap: 2px;
}

.fps-tab {
  flex: 1;
  height: 26px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 120ms ease;
}

.fps-tab:hover {
  color: var(--text);
}

.fps-tab.active {
  background-color: var(--raised);
  border-color: var(--border-strong);
  color: var(--accent);
  font-weight: 600;
}

/* Footer & Buttons */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.footer-center {
  justify-content: center;
}

.btn-cancel {
  height: 28px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 12px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 120ms ease;
}
.btn-cancel:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

.btn-render-primary {
  height: 28px;
  padding: 0 16px;
  background-color: var(--accent);
  border: 1px solid transparent;
  color: #121315;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: opacity 120ms ease;
}
.btn-render-primary:hover {
  opacity: 0.92;
}

/* Rendering State Styles */
.rendering-content {
  gap: 16px;
  padding: 20px 16px;
}

.phase-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--accent);
  background-color: var(--bg);
  border: 1px solid var(--border);
  padding: 6px 10px;
  border-radius: var(--radius);
}

.phase-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--accent);
}

.progress-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-numbers {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.percent-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.frame-text {
  font-size: 11px;
  color: var(--text-dim);
}

.progress-track {
  height: 5px;
  background-color: var(--bg);
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}

.progress-fill {
  height: 100%;
  background-color: var(--accent);
  transition: width 150ms linear;
}

.timer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.timer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: var(--bg);
  border: 1px solid var(--border);
  padding: 8px 12px;
  border-radius: var(--radius);
}

.timer-icon {
  color: var(--text-dim);
}

.timer-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.timer-caption {
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.05em;
  font-weight: 600;
}

.timer-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.timer-num.accent {
  color: var(--accent);
}

.lock-caption {
  font-size: 10px;
  color: var(--text-dim);
  text-align: center;
}

.btn-danger-outline {
  height: 28px;
  padding: 0 14px;
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 120ms ease;
}
.btn-danger-outline:hover {
  background-color: rgba(229, 83, 75, 0.1);
}

/* Done State */
.done-content {
  text-align: center;
  align-items: center;
  padding: 24px 16px;
}

.done-icon-wrap {
  color: var(--ok);
  margin-bottom: 2px;
}
.error-icon-wrap {
  color: var(--danger);
  margin-bottom: 2px;
}

.done-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.error-text { color: var(--danger); }

.done-sub {
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 6px;
}

.summary-table {
  width: 100%;
  background-color: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}
.s-label { color: var(--text-dim); }
.s-val { color: var(--text); font-weight: 500; }
.path-val { color: var(--accent); }
</style>
