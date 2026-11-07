import { ref } from 'vue';
import type { StoryboardScene, ProjectInfo } from '../lib/types';
import { useAudio } from './useAudio';

export const PROJECT_STORAGE_KEY = 'kenmotion_active_project';

const initialProjectId = (() => {
  try {
    const urlParam = new URLSearchParams(window.location.search).get('project');
    if (urlParam) return urlParam;
    const stored = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (stored) return stored;
  } catch {}
  return 'ted';
})();

const currentProjectId = ref<string>(initialProjectId);
const projects = ref<ProjectInfo[]>([]);
const scenes = ref<StoryboardScene[]>([]);
const currentTime = ref<number>(0);
const duration = ref<number>(10);
const isPlaying = ref<boolean>(false);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const previewReloadKey = ref<number>(Date.now());

let playRafId: number | null = null;
let lastRafTime: number = 0;

type IframeWindow = Window & {
  __seek?: (t: number) => void;
  __duration?: number;
};

function getIframeWin(): IframeWindow | null {
  try {
    return iframeRef.value?.contentWindow as IframeWindow ?? null;
  } catch {
    return null;
  }
}

export function usePlayer() {
  const { syncPlayback, checkAndTriggerSFX, stopAllContinuous } = useAudio();

  const seekTo = (time: number): void => {
    const clamped = Math.max(0, Math.min(time, duration.value));
    currentTime.value = clamped;
    const win = getIframeWin();
    if (typeof win?.__seek === 'function') {
      win.__seek(clamped);
    }
  };

  const stepFrame = (forward: boolean): void => {
    seekTo(currentTime.value + (forward ? 1 / 30 : -1 / 30));
  };

  const playTick = (timestamp: number): void => {
    if (!isPlaying.value) return;
    if (!lastRafTime) lastRafTime = timestamp;
    const delta = (timestamp - lastRafTime) / 1000;
    lastRafTime = timestamp;

    const nextTime = currentTime.value + delta;
    if (nextTime >= duration.value) {
      seekTo(duration.value);
      pause();
      return;
    }
    seekTo(nextTime);
    checkAndTriggerSFX(nextTime);
    playRafId = requestAnimationFrame(playTick);
  };

  const play = (): void => {
    if (isPlaying.value) return;
    if (currentTime.value >= duration.value) seekTo(0);
    isPlaying.value = true;
    lastRafTime = performance.now();
    syncPlayback(true, currentTime.value);
    playRafId = requestAnimationFrame(playTick);
  };

  const pause = (): void => {
    isPlaying.value = false;
    if (playRafId !== null) {
      cancelAnimationFrame(playRafId);
      playRafId = null;
    }
    lastRafTime = 0;
    stopAllContinuous();
  };

  const togglePlay = (): void => {
    if (isPlaying.value) pause(); else play();
  };

  const jumpToScene = (sceneIndex: number): void => {
    if (sceneIndex >= 0 && sceneIndex < scenes.value.length) {
      seekTo(scenes.value[sceneIndex].start);
    }
  };

  const jumpPrevScene = (): void => {
    const cur = currentTime.value;
    const prev = [...scenes.value].reverse().find((s) => s.start < cur - 0.1);
    seekTo(prev ? prev.start : 0);
  };

  const jumpNextScene = (): void => {
    const next = scenes.value.find((s) => s.start > currentTime.value + 0.05);
    seekTo(next ? next.start : duration.value);
  };

  const setIframe = (el: HTMLIFrameElement | null): void => {
    iframeRef.value = el;
  };

  const onIframeLoaded = (): void => {
    const win = getIframeWin();
    if (!win) return;
    if (typeof win.__duration === 'number' && win.__duration > 0) {
      duration.value = win.__duration;
    }
    if (typeof win.__seek === 'function') {
      win.__seek(currentTime.value);
    }
  };

  const reloadPreview = (): void => {
    previewReloadKey.value = Date.now();
  };

  const refreshProjects = async (): Promise<ProjectInfo[]> => {
    try {
      const res = await fetch('/projects');
      if (res.ok) {
        const list = await res.json() as ProjectInfo[];
        projects.value = list;
        return list;
      }
    } catch (err) {
      console.error('Gagal memuat daftar projek:', err);
    }
    return projects.value;
  };

  return {
    currentProjectId, projects, scenes, currentTime, duration, isPlaying, previewReloadKey,
    seekTo, stepFrame, play, pause, togglePlay,
    jumpToScene, jumpPrevScene, jumpNextScene,
    setIframe, onIframeLoaded, reloadPreview, refreshProjects,
  };
}
