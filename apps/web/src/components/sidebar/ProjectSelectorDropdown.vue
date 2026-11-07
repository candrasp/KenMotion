<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { Folder, Check, ChevronDown, Search } from 'lucide-vue-next';
import { usePlayer } from '../../composables/usePlayer';

const { currentProjectId, projects, refreshProjects } = usePlayer();

const emit = defineEmits<{
  (e: 'select', projectId: string): void;
}>();

const pickerWrapperRef = ref<HTMLDivElement | null>(null);
const isDropdownOpen = ref<boolean>(false);
const searchQuery = ref<string>('');
const searchInputRef = ref<HTMLInputElement | null>(null);

const filteredProjects = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return projects.value;
  return projects.value.filter((p) => p.id.toLowerCase().includes(q));
});

const toggleDropdown = async (): Promise<void> => {
  isDropdownOpen.value = !isDropdownOpen.value;
  if (isDropdownOpen.value) {
    searchQuery.value = '';
    void refreshProjects();
    await nextTick();
    searchInputRef.value?.focus();
  }
};

const closeDropdown = (): void => {
  isDropdownOpen.value = false;
  searchQuery.value = '';
};

const handleSelect = (id: string): void => {
  closeDropdown();
  emit('select', id);
};

const handleKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') {
    closeDropdown();
  } else if (e.key === 'Enter' && filteredProjects.value.length > 0) {
    handleSelect(filteredProjects.value[0].id);
  }
};

const handleClickOutside = (e: MouseEvent): void => {
  if (isDropdownOpen.value && pickerWrapperRef.value && !pickerWrapperRef.value.contains(e.target as Node)) {
    closeDropdown();
  }
};

onMounted(() => {
  document.addEventListener('pointerdown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleClickOutside);
});
</script>

<template>
  <div class="project-picker-wrapper" ref="pickerWrapperRef">
    <div class="project-card" @click="toggleDropdown">
      <Folder :size="15" class="folder-main" />
      <span class="project-title">{{ currentProjectId || 'Pilih Projek' }}</span>
      <ChevronDown :size="13" class="chevron" :class="{ open: isDropdownOpen }" />
    </div>

    <!-- Menu Dropdown dengan Pencarian -->
    <div v-if="isDropdownOpen" class="project-dropdown">
      <div class="search-box">
        <Search :size="12" class="search-icon" />
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          @keydown="handleKeyDown"
          type="text"
          placeholder="Cari projek..."
          class="search-input"
        />
      </div>

      <div class="dropdown-list">
        <div
          v-for="p in filteredProjects"
          :key="p.id"
          class="dropdown-item"
          :class="{ active: p.id === currentProjectId }"
          @click.stop="handleSelect(p.id)"
        >
          <Folder :size="13" />
          <span class="item-name">{{ p.id }}</span>
          <Check v-if="p.id === currentProjectId" :size="13" class="check-icon" />
        </div>

        <div v-if="filteredProjects.length === 0" class="dropdown-empty">
          Tidak ada projek yang cocok
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-picker-wrapper {
  position: relative;
}

.project-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--raised);
  border: 1px solid var(--border);
  padding: 5px 8px;
  border-radius: var(--radius);
  cursor: pointer;
}

.project-card:hover {
  border-color: var(--border-strong);
}

.folder-main {
  color: var(--accent);
  flex-shrink: 0;
}

.project-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chevron {
  color: var(--text-dim);
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.project-dropdown {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  background-color: var(--panel);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
  background-color: var(--bg);
}

.search-icon {
  color: var(--text-dim);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 11px;
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--text-dim);
}

.dropdown-list {
  max-height: 180px;
  overflow-y: auto;
  padding: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-dim);
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: var(--raised);
  color: var(--text);
}

.dropdown-item.active {
  color: var(--text);
  font-weight: 600;
}

.item-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  color: var(--accent);
}

.dropdown-empty {
  font-size: 11px;
  color: var(--text-dim);
  padding: 10px;
  text-align: center;
}
</style>

