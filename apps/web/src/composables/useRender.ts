import type { RenderProgress, RenderStatus } from '../lib/types';

export type { RenderProgress, RenderStatus };

const SERVER = '';

export function useRender() {
  let eventSource: EventSource | null = null;

  const startRender = (
    projectId: string,
    fps: number,
    resolution: '720p' | '1080p',
    onProgress: (p: RenderProgress) => void
  ): void => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    // SSE via EventSource tidak mendukung POST body, kita gunakan fetch + readable stream
    const url = `${SERVER}/render/${projectId}?fps=${fps}&resolution=${resolution}`;

    fetch(url, { method: 'POST' })
      .then(async (res) => {
        if (!res.ok || !res.body) {
          onProgress({ status: 'error', frame: 0, totalFrames: 0, fps, error: `HTTP ${res.status}` });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE chunks robustly (handles \r\n and \n)
          const chunks = buffer.split(/\r?\n\r?\n/);
          buffer = chunks.pop() ?? '';

          for (const chunk of chunks) {
            const dataLine = chunk.split(/\r?\n/).find((l) => l.trim().startsWith('data:'));
            if (dataLine) {
              try {
                const jsonStr = dataLine.trim().slice(5).trim();
                const parsed = JSON.parse(jsonStr) as RenderProgress;
                onProgress(parsed);
              } catch {
                // skip malformed SSE
              }
            }
          }
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Koneksi gagal';
        onProgress({ status: 'error', frame: 0, totalFrames: 0, fps, error: message });
      });
  };

  const cancelRender = async (): Promise<void> => {
    await fetch(`${SERVER}/render`, { method: 'DELETE' });
  };

  return { startRender, cancelRender };
}

