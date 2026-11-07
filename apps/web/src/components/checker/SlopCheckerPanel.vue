<script setup lang="ts">
import { ref } from 'vue';
import { TriangleAlert, CircleCheck, Copy, Check, RefreshCw } from 'lucide-vue-next';
import { usePlayer } from '../../composables/usePlayer';
import type { InspectionSummary } from '../../lib/types';

const { currentProjectId, seekTo } = usePlayer();

const report = ref<InspectionSummary | null>(null);
const isLoading = ref<boolean>(false);
const isCopied = ref<boolean>(false);
const errorMessage = ref<string>('');

const runCheck = async (): Promise<void> => {
  if (isLoading.value) return;
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const res = await fetch(`/check/${currentProjectId.value}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Pemeriksaan gagal (${res.status})`);
    report.value = await res.json() as InspectionSummary;
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Gagal menjalankan pemeriksaan';
  } finally {
    isLoading.value = false;
  }
};

const copyPrompt = async (): Promise<void> => {
  if (!report.value?.fixPrompt) return;
  await navigator.clipboard.writeText(report.value.fixPrompt);
  isCopied.value = true;
  setTimeout(() => { isCopied.value = false; }, 2000);
};
</script>

<template>
  <aside class="checker-panel">
    <div class="panel-header">
      <span class="panel-title">PEMERIKSA SLOP</span>
      <button @click="runCheck" :disabled="isLoading" class="btn-check">
        <RefreshCw :size="13" :class="{ 'animate-spin': isLoading }" />
        <span>{{ isLoading ? 'Memeriksa...' : 'Periksa' }}</span>
      </button>
    </div>

    <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

    <div v-if="report" class="report-content">
      <!-- Summary stats -->
      <div class="summary-stats">
        <div class="stat-badge ok">
          <CircleCheck :size="14" />
          <span>{{ report.passedCount }} Lolos</span>
        </div>
        <div class="stat-badge warn" v-if="report.issuesCount > 0">
          <TriangleAlert :size="14" />
          <span>{{ report.issuesCount }} Perlu Cek</span>
        </div>
      </div>

      <!-- Global findings -->
      <div v-if="report.globalFindings.length > 0" class="global-findings">
        <div class="section-label">MASALAH GLOBAL</div>
        <div
          v-for="(g, idx) in report.globalFindings"
          :key="idx"
          class="global-finding-item"
          :class="g.severity"
        >
          <TriangleAlert :size="13" />
          <div class="gf-content">
            <span class="gf-message">{{ g.message }}</span>
            <span v-if="g.affectedScenes.length > 0" class="gf-affected">
              {{ g.affectedScenes.length }} scene terdampak
            </span>
          </div>
        </div>
      </div>

      <!-- Per-scene list -->
      <div class="scenes-list">
        <div
          v-for="item in report.scenes"
          :key="item.scene"
          class="scene-row"
          :class="{ has_issues: item.findings.length > 0 }"
          @click="seekTo(item.start)"
        >
          <div class="scene-row-header">
            <span class="scene-tag">Scene {{ item.scene }}</span>
            <span class="scene-time mono">{{ item.start.toFixed(2) }}s</span>
          </div>

          <div v-if="item.findings.length === 0" class="finding-ok">
            <CircleCheck :size="13" class="icon-ok" />
            <span>Sesuai spesifikasi</span>
          </div>

          <div v-else class="finding-list">
            <div
              v-for="(f, idx2) in item.findings"
              :key="idx2"
              class="finding-item"
              :class="f.severity"
            >
              <TriangleAlert :size="13" />
              <div class="finding-texts">
                <span class="finding-msg">{{ f.message }}</span>
                <span v-if="f.details" class="finding-details">{{ f.details }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Prompt perbaikan -->
      <div class="prompt-section">
        <div class="prompt-header">
          <span class="prompt-title">Prompt Perbaikan Claude</span>
          <button @click="copyPrompt" class="copy-btn">
            <Check v-if="isCopied" :size="13" />
            <Copy v-else :size="13" />
            <span>{{ isCopied ? 'Tersalin' : 'Salin' }}</span>
          </button>
        </div>
        <textarea readonly class="prompt-textarea mono" :value="report.fixPrompt" rows="5" />
      </div>
    </div>

    <div v-else class="empty-state">
      <span>Klik "Periksa" untuk memindai kepatuhan scene, safe area, script, dan font.</span>
    </div>
  </aside>
</template>

<style scoped>
.checker-panel {
  width: 100%;
  background-color: var(--panel);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.panel-header {
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-title {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  font-weight: 600;
}

.btn-check { font-size: 12px; height: 24px; }

.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.error-banner {
  padding: 8px 12px;
  background-color: rgba(229, 83, 75, 0.1);
  color: var(--danger);
  font-size: 12px;
  border-bottom: 1px solid var(--border);
}

.report-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.summary-stats {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--radius);
}

.stat-badge.ok { background: rgba(76, 175, 125, 0.15); color: var(--ok); }
.stat-badge.warn { background: rgba(217, 164, 65, 0.15); color: var(--warn); }

.global-findings {
  border-bottom: 1px solid var(--border);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.section-label {
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--text-dim);
  font-weight: 600;
  margin-bottom: 2px;
}

.global-finding-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: var(--radius);
}

.global-finding-item.error {
  background: rgba(229, 83, 75, 0.1);
  color: var(--danger);
}

.global-finding-item.warning {
  background: rgba(217, 164, 65, 0.1);
  color: var(--warn);
}

.gf-content { display: flex; flex-direction: column; gap: 2px; }
.gf-message { line-height: 1.4; }
.gf-affected { font-size: 10px; opacity: 0.7; }

.scenes-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.scene-row {
  background: var(--raised);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 10px;
  cursor: pointer;
  transition: border-color 120ms ease;
}

.scene-row:hover { border-color: var(--border-strong); }
.scene-row.has_issues { border-left: 2px solid var(--warn); }

.scene-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.scene-tag { font-size: 11px; font-weight: 600; }
.scene-time { font-size: 11px; color: var(--text-dim); }

.finding-ok {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--ok);
}

.finding-list { display: flex; flex-direction: column; gap: 3px; }

.finding-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
}

.finding-item.error { color: var(--danger); }
.finding-item.warning { color: var(--warn); }

.finding-texts { display: flex; flex-direction: column; }
.finding-details { font-size: 10px; color: var(--text-dim); }

.prompt-section {
  border-top: 1px solid var(--border);
  padding: 8px 12px 18px 12px;
  flex-shrink: 0;
  margin-top: auto;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.prompt-title { font-size: 11px; color: var(--text-dim); }

.copy-btn { height: 22px; font-size: 11px; padding: 0 6px; }

.prompt-textarea {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 11px;
  padding: 6px;
  resize: none;
  border-radius: var(--radius);
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  color: var(--text-dim);
  font-size: 12px;
}
</style>
