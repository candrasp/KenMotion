import { ref } from 'vue';

export type PlatformPreset = 'universal' | 'tiktok' | 'shorts' | 'reels';

export interface SafeAreaBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
  label: string;
}

export const PRESETS: Record<PlatformPreset, SafeAreaBox> = {
  universal: {
    top: 180,
    bottom: 340,
    left: 60,
    right: 140,
    label: 'Universal (Aman Semua)',
  },
  tiktok: {
    top: 180,
    bottom: 340,
    left: 60,
    right: 140,
    label: 'TikTok',
  },
  shorts: {
    top: 140,
    bottom: 300,
    left: 60,
    right: 130,
    label: 'YouTube Shorts',
  },
  reels: {
    top: 120,
    bottom: 340,
    left: 50,
    right: 130,
    label: 'Meta (IG & FB Reels)',
  },
};

const showOverlay = ref<boolean>(false);
const activePreset = ref<PlatformPreset>('universal');
const showGuides = ref<boolean>(true);

export function useSafeArea() {
  const toggleOverlay = (): void => {
    showOverlay.value = !showOverlay.value;
  };

  const setPreset = (preset: PlatformPreset): void => {
    activePreset.value = preset;
  };

  return {
    showOverlay,
    activePreset,
    showGuides,
    presets: PRESETS,
    toggleOverlay,
    setPreset,
  };
}

