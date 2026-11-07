import { ref } from 'vue';
import { usePlayer } from './usePlayer';

const API_BASE = '';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolStatus?: string;
  timestamp: number;
}

// Module-level shared state — satu instance per app
const messages = ref<ChatMessage[]>([]);
const isStreaming = ref<boolean>(false);
const activeSessionId = ref<string>('');
const activeProjectId = ref<string>('');

// AbortController aktif untuk cancel stream lama saat pindah projek
let activeAbort: AbortController | null = null;

export function useChat() {
  const { reloadPreview } = usePlayer();
  /**
   * Pindah ke projek baru:
   * 1. Batalkan stream yang sedang berjalan (jika ada)
   * 2. Reset UI langsung (tidak ada pesan lama tampil)
   * 3. Fetch sesi projek baru
   * 4. Validasi projek masih sama saat response tiba (anti-race)
   */
  const loadSession = async (projectId: string): Promise<void> => {
    // Hentikan proses aktif di backend jika sedang streaming
    if (activeSessionId.value && isStreaming.value) {
      try {
        fetch(`${API_BASE}/chat/stop/${activeSessionId.value}`, { method: 'POST' }).catch(() => {});
      } catch {}
    }

    // Batalkan fetch/stream lama
    if (activeAbort) {
      activeAbort.abort();
      activeAbort = null;
    }

    // Reset state segera — tidak ada pesan lama tampil
    messages.value = [];
    isStreaming.value = false;
    activeSessionId.value = '';
    activeProjectId.value = projectId;

    const abort = new AbortController();
    activeAbort = abort;

    try {
      const res = await fetch(`${API_BASE}/chat/session/${projectId}`, { signal: abort.signal });

      // Projek sudah berubah lagi saat response tiba — abaikan
      if (activeProjectId.value !== projectId) return;

      if (res.ok) {
        const data = await res.json() as {
          sessionId: string;
          messages: ChatMessage[];
          isRunning: boolean;
        };

        // Cek sekali lagi setelah json() — fetch bisa lambat
        if (activeProjectId.value !== projectId) return;

        activeSessionId.value = data.sessionId;
        messages.value = data.messages || [];
        isStreaming.value = data.isRunning;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('Gagal memuat sesi chat:', err);
    } finally {
      if (activeAbort === abort) activeAbort = null;
    }
  };

  const sendMessage = async (projectId: string, promptText: string): Promise<void> => {
    if (isStreaming.value || !promptText.trim()) return;

    // Batalkan abort lama jika ada (tidak sedang streaming, tapi loadSession belum selesai)
    if (activeAbort) {
      activeAbort.abort();
    }
    const abort = new AbortController();
    activeAbort = abort;

    messages.value.push({
      id: crypto.randomUUID(),
      role: 'user',
      content: promptText,
      timestamp: Date.now(),
    });

    isStreaming.value = true;

    const assistantMsgId = crypto.randomUUID();
    messages.value.push({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    });

    try {
      const res = await fetch(`${API_BASE}/chat/send/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat error HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      readLoop: while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Projek sudah berubah saat streaming — hentikan
        if (activeProjectId.value !== projectId) {
          await reader.cancel();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        // Tangani pemisah baris event SSE (\n\n atau \r\n\r\n atau single \n dengan data:)
        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const lines = chunk.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            try {
              const event = JSON.parse(trimmed.slice(5).trim()) as {
                type: string;
                data?: unknown;
                code?: number;
                error?: string;
              };

              const targetMsg = messages.value.find((m) => m.id === assistantMsgId);

              // Selesai / Error: Hentikan status streaming & reload preview iframe
              if (event.type === 'done' || event.type === 'error') {
                if (targetMsg) targetMsg.toolStatus = undefined;
                isStreaming.value = false;
                reloadPreview();
                await reader.cancel();
                break readLoop;
              }

              if (!targetMsg) continue;

              if (event.type === 'claude-event' && event.data && typeof event.data === 'object') {
                const ed = event.data as Record<string, unknown>;

                type ContentBlock = { type: string; text?: string; name?: string };

                if (ed.type === 'stream_event' && ed.event && typeof ed.event === 'object') {
                  // Token parsial real-time dari Claude CLI
                  const innerEv = ed.event as {
                    type?: string;
                    index?: number;
                    content_block?: { type?: string };
                    delta?: { type?: string; text?: string };
                  };
                  if (innerEv.type === 'content_block_start' && innerEv.content_block?.type === 'tool_use') {
                    // Claude mulai memanggil tool — tampilkan status
                    if (!targetMsg.toolStatus) targetMsg.toolStatus = 'memproses';
                  } else if (innerEv.type === 'content_block_delta' && innerEv.delta?.text) {
                    // Token teks masuk — sembunyikan status tool, append ke konten
                    targetMsg.toolStatus = undefined;
                    targetMsg.content += innerEv.delta.text;
                  }
                } else if (ed.type === 'assistant') {
                  // Event giliran lengkap: gunakan HANYA untuk deteksi nama tool, bukan untuk teks
                  // (teks sudah diakumulasi lewat stream_event delta di atas)
                  const msgObj = ed.message as { content?: ContentBlock[] } | undefined;
                  if (msgObj?.content) {
                    const toolNames = msgObj.content
                      .filter((c) => c.type === 'tool_use' && c.name)
                      .map((c) => c.name as string);
                    if (toolNames.length > 0) {
                      targetMsg.toolStatus = toolNames.join(', ');
                    }
                    // Jika tidak ada teks sama sekali dari stream_event, isi dari sini sebagai fallback
                    if (!targetMsg.content) {
                      const textParts = msgObj.content
                        .filter((c) => c.type === 'text' && typeof c.text === 'string')
                        .map((c) => c.text as string)
                        .join('');
                      if (textParts) {
                        targetMsg.toolStatus = undefined;
                        targetMsg.content = textParts;
                      }
                    }
                  }
                } else if (ed.type === 'result') {
                  // Fallback akhir: jika konten masih kosong setelah semua event selesai
                  targetMsg.toolStatus = undefined;
                  if (!targetMsg.content && typeof ed.result === 'string' && ed.result.trim()) {
                    targetMsg.content = ed.result.trim();
                  }
                }
              }
            } catch {
              // Abaikan baris rusak
            }
          }
        }
      }

      // Stream selesai secara alami (koneksi ditutup)
      const finalMsg = messages.value.find((m) => m.id === assistantMsgId);
      if (finalMsg) finalMsg.toolStatus = undefined;
      isStreaming.value = false;
      reloadPreview();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // "network error" dari ReadableStream saat SSE selesai normal — bukan error nyata
      const isNormalClose = err instanceof TypeError && err.message.toLowerCase().includes('network');
      if (!isNormalClose) {
        const msg = err instanceof Error ? err.message : 'Koneksi terputus';
        const targetMsg = messages.value.find((m) => m.id === assistantMsgId);
        if (targetMsg) targetMsg.content += `\n[Error: ${msg}]`;
      }
    } finally {
      if (activeAbort === abort) activeAbort = null;
      isStreaming.value = false;
    }
  };

  const stopGeneration = async (): Promise<void> => {
    if (activeAbort) {
      activeAbort.abort();
      activeAbort = null;
    }
    isStreaming.value = false;
    if (!activeSessionId.value) return;
    try {
      await fetch(`${API_BASE}/chat/stop/${activeSessionId.value}`, { method: 'POST' });
    } catch {}
  };

  const clearChat = async (projectId: string): Promise<void> => {
    if (activeAbort) {
      activeAbort.abort();
      activeAbort = null;
    }
    messages.value = [];
    isStreaming.value = false;
    activeSessionId.value = '';
    try {
      await fetch(`${API_BASE}/chat/clear/${projectId}`, { method: 'POST' });
    } catch (err) {
      console.warn('Gagal mereset chat:', err);
    }
  };

  return {
    messages,
    isStreaming,
    loadSession,
    sendMessage,
    stopGeneration,
    clearChat,
  };
}
