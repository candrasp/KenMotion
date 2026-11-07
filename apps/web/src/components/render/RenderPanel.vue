<script setup lang="ts">
import { ref } from 'vue';
import { Film } from 'lucide-vue-next';
import RenderModal from './RenderModal.vue';

const isModalOpen = ref<boolean>(false);

const openModal = (): void => {
  isModalOpen.value = true;
};

const closeModal = (): void => {
  isModalOpen.value = false;
};
</script>

<template>
  <div class="render-panel-wrap">
    <button @click="openModal" class="btn-open-render" title="Buka dialog render video">
      <Film :size="13" />
      <span>Render Video</span>
    </button>

    <RenderModal v-if="isModalOpen" @close="closeModal" />
  </div>
</template>

<style scoped>
.render-panel-wrap {
  display: flex;
  align-items: center;
}

.btn-open-render {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: var(--accent);
  color: #0b111e;
  border: none;
  font-weight: 700;
  font-size: 11px;
  height: 26px;
  padding: 0 10px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-open-render:hover {
  opacity: 0.9;
}
</style>
