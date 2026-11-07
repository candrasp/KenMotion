<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next';

defineProps<{
  targetProjectId: string;
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <div class="modal-backdrop">
    <div class="confirm-card">
      <div class="confirm-head">
        <AlertTriangle :size="18" class="warn-icon" />
        <span class="confirm-title">Pindah Projek?</span>
      </div>
      <p class="confirm-desc">
        Kamu akan beralih ke projek <strong>{{ targetProjectId }}</strong>. Pastikan perubahan yang sedang kamu edit sudah disimpan.
      </p>
      <div class="confirm-actions">
        <button class="btn-cancel" @click="emit('cancel')">Batal</button>
        <button class="btn-confirm" @click="emit('confirm')">Ya, Pindah</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.confirm-card {
  width: 320px;
  background-color: var(--panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.confirm-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.warn-icon {
  color: var(--warn);
}

.confirm-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.confirm-desc {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.4;
  margin-bottom: 16px;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 4px 12px;
  font-size: 12px;
  border-radius: var(--radius);
  cursor: pointer;
}

.btn-cancel:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

.btn-confirm {
  background: var(--accent);
  border: 1px solid var(--accent);
  color: #fff;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: var(--radius);
  cursor: pointer;
  font-weight: 500;
}

.btn-confirm:hover {
  filter: brightness(1.1);
}
</style>

