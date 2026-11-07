import { ref } from 'vue';
import type { StyleOverride } from '../lib/types';

const fixes = ref<StyleOverride[]>([]);
const isSaving = ref<boolean>(false);

export function useFixes() {
  const loadFixes = async (projectId: string): Promise<void> => {
    try {
      const res = await fetch(`/fixes/${projectId}`);
      if (res.ok) {
        fixes.value = (await res.json()) as StyleOverride[];
      }
    } catch (err) {
      console.warn('Gagal memuat fixes:', err);
    }
  };

  const applyFixesToIframe = (iframeEl: HTMLIFrameElement | null): void => {
    if (!iframeEl?.contentDocument) return;
    const doc = iframeEl.contentDocument;

    for (const fix of fixes.value) {
      // Cari elemen di dalam scene terkait
      const sceneEl = doc.querySelector(`[data-scene="${fix.scene}"]`) || doc;
      const targetEl = sceneEl.querySelector(fix.selector) as HTMLElement | null;

      if (targetEl) {
        if (fix.style) {
          for (const [prop, val] of Object.entries(fix.style)) {
            targetEl.style.setProperty(prop, val);
          }
        }
        if (fix.text !== undefined) {
          targetEl.textContent = fix.text;
        }
      }
    }
  };

  const saveFixes = async (projectId: string): Promise<boolean> => {
    isSaving.value = true;
    try {
      const res = await fetch(`/fixes/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fixes.value),
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isSaving.value = false;
    }
  };

  const addOrUpdateFix = (fix: StyleOverride, iframeEl: HTMLIFrameElement | null, projectId: string): void => {
    const existingIdx = fixes.value.findIndex(
      (f) => f.scene === fix.scene && f.selector === fix.selector
    );
    if (existingIdx >= 0) {
      fixes.value[existingIdx] = {
        ...fixes.value[existingIdx],
        style: { ...fixes.value[existingIdx].style, ...fix.style },
        text: fix.text ?? fixes.value[existingIdx].text,
      };
    } else {
      fixes.value.push(fix);
    }
    applyFixesToIframe(iframeEl);
    saveFixes(projectId);
  };

  return {
    fixes,
    isSaving,
    loadFixes,
    applyFixesToIframe,
    saveFixes,
    addOrUpdateFix,
  };
}

