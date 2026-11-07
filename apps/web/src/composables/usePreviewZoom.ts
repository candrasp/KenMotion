import { ref, computed } from 'vue';

const STAGE_WIDTH = 1080;
const STAGE_HEIGHT = 1920;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

export function usePreviewZoom() {
  const containerRef = ref<HTMLDivElement | null>(null);
  const baseScale = ref<number>(1);
  const zoomMultiplier = ref<number>(1);
  const isFullscreen = ref<boolean>(false);

  // Posisi Pan (geser kanvas)
  const panX = ref<number>(0);
  const panY = ref<number>(0);
  const isDragging = ref<boolean>(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let initialPanX = 0;
  let initialPanY = 0;

  const effectiveScale = computed(() => baseScale.value * zoomMultiplier.value);
  const zoomPercent = computed(() => Math.round(zoomMultiplier.value * 100));

  const updateScale = (): void => {
    if (!containerRef.value) return;
    const rect = containerRef.value.getBoundingClientRect();
    const padding = 32;
    const availW = Math.max(100, rect.width - padding);
    const availH = Math.max(100, rect.height - padding);

    const scaleW = availW / STAGE_WIDTH;
    const scaleH = availH / STAGE_HEIGHT;
    baseScale.value = Math.min(scaleW, scaleH);
  };

  const zoomIn = (): void => {
    zoomMultiplier.value = Math.min(MAX_ZOOM, +(zoomMultiplier.value + ZOOM_STEP).toFixed(2));
  };

  const zoomOut = (): void => {
    zoomMultiplier.value = Math.max(MIN_ZOOM, +(zoomMultiplier.value - ZOOM_STEP).toFixed(2));
  };

  const resetZoom = (): void => {
    zoomMultiplier.value = 1;
    panX.value = 0;
    panY.value = 0;
  };

  const handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    // 1. Zoom dengan Ctrl / Cmd + Scroll
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomMultiplier.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(zoomMultiplier.value * factor).toFixed(2)));
      return;
    }

    // 2. Pan dengan Scroll biasa atau 2-jari trackpad
    if (e.shiftKey) {
      panX.value -= e.deltaY || e.deltaX;
    } else {
      panX.value -= e.deltaX;
      panY.value -= e.deltaY;
    }
  };

  const startDrag = (e: MouseEvent): void => {
    if (e.button !== 0) return; // Hanya klik kiri
    isDragging.value = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialPanX = panX.value;
    initialPanY = panY.value;

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', stopDrag);
  };

  const onDragMove = (e: MouseEvent): void => {
    if (!isDragging.value) return;
    panX.value = initialPanX + (e.clientX - dragStartX);
    panY.value = initialPanY + (e.clientY - dragStartY);
  };

  const stopDrag = (): void => {
    isDragging.value = false;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', stopDrag);
  };

  const toggleFullscreen = async (): Promise<void> => {
    if (!containerRef.value) return;
    if (!document.fullscreenElement) {
      await containerRef.value.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  };

  const handleFullscreenChange = (): void => {
    isFullscreen.value = !!document.fullscreenElement;
    updateScale();
  };

  return {
    STAGE_WIDTH,
    STAGE_HEIGHT,
    MIN_ZOOM,
    MAX_ZOOM,
    containerRef,
    zoomMultiplier,
    panX,
    panY,
    isDragging,
    isFullscreen,
    effectiveScale,
    zoomPercent,
    updateScale,
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheel,
    startDrag,
    toggleFullscreen,
    handleFullscreenChange,
  };
}
