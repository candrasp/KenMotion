<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { ArrowUp, Square, Sparkles, Plus, Copy, Check } from 'lucide-vue-next';
import { marked } from 'marked';
import { useChat } from '../../composables/useChat';
import { usePlayer } from '../../composables/usePlayer';

const { currentProjectId, currentTime, scenes } = usePlayer();
const { messages, isStreaming, loadSession, sendMessage, stopGeneration, clearChat } = useChat();

const inputText = ref<string>('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const chatScrollRef = ref<HTMLDivElement | null>(null);
const copiedId = ref<string | null>(null);

const currentScene = computed(() => {
  return scenes.value.find((s) => currentTime.value >= s.start && currentTime.value < s.end)
    || scenes.value.find((s) => currentTime.value <= s.end)
    || null;
});

const sceneLabel = computed(() => {
  if (!currentScene.value) return null;
  const id = currentScene.value.scene;
  return id.toLowerCase().startsWith('scene') ? id : `Scene ${id}`;
});

const timeChipDisplay = computed(() => {
  const timeStr = `${currentTime.value.toFixed(1)}s`;
  return sceneLabel.value ? `${timeStr} · ${sceneLabel.value}` : timeStr;
});

const timeChipTag = computed(() => {
  const timeStr = `${currentTime.value.toFixed(1)}s`;
  return sceneLabel.value ? `${timeStr} (${sceneLabel.value})` : timeStr;
});

const insertTimeContext = (): void => {
  const tag = `[Waktu: ${timeChipTag.value}]`;
  const el = textareaRef.value;
  if (!el) {
    inputText.value += (inputText.value ? ' ' : '') + tag + ' ';
    return;
  }

  const start = el.selectionStart ?? inputText.value.length;
  const end = el.selectionEnd ?? inputText.value.length;
  const current = inputText.value;

  const needLeadingSpace = start > 0 && current[start - 1] !== ' ';
  const needTrailingSpace = end < current.length && current[end] !== ' ';

  const insertText = `${needLeadingSpace ? ' ' : ''}${tag}${needTrailingSpace ? ' ' : ' '}`;
  inputText.value = current.slice(0, start) + insertText + current.slice(end);

  const newPos = start + insertText.length;
  nextTick(() => {
    adjustTextareaHeight();
    el.focus();
    el.setSelectionRange(newPos, newPos);
  });
};

const adjustTextareaHeight = (): void => {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
};

const renderMarkdown = (content: string): string => {
  if (!content) return '';
  return marked.parse(content, { breaks: true, gfm: true }) as string;
};

const formatTime = (ts?: number): string => {
  if (!ts) return '';
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const copyContent = async (id: string, text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    copiedId.value = id;
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null;
    }, 2000);
  } catch (err) {
    console.warn('Gagal menyalin:', err);
  }
};

const scrollToBottom = async (): Promise<void> => {
  await nextTick();
  if (chatScrollRef.value) {
    chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight;
  }
};

watch(() => messages.value.length, scrollToBottom);
watch(() => messages.value[messages.value.length - 1]?.content, scrollToBottom);

const handleSend = async (): Promise<void> => {
  if (!inputText.value.trim() || isStreaming.value) return;
  const prompt = inputText.value;
  inputText.value = '';
  nextTick(() => {
    adjustTextareaHeight();
  });
  await sendMessage(currentProjectId.value, prompt);
};

const handleKeyDown = (e: KeyboardEvent): void => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (isStreaming.value) return;
    handleSend();
  }
};

const handleClearChat = async (): Promise<void> => {
  await clearChat(currentProjectId.value);
};

watch(
  currentProjectId,
  (newId) => {
    if (newId) {
      loadSession(newId);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="chat-panel">
    <!-- Floating New Chat Icon (hanya tampil jika ada riwayat) -->
    <button
      v-if="messages.length > 0"
      @click="handleClearChat"
      :disabled="isStreaming"
      class="floating-new-chat-btn"
      title="Mulai chat baru"
    >
      <Plus :size="13" />
    </button>

    <!-- Message Stream -->
    <div class="messages-container" ref="chatScrollRef">
      <div v-if="messages.length === 0" class="empty-state">
        <Sparkles :size="18" class="empty-icon" />
        <p class="empty-text">Minta Claude mengedit animasi, scene, safe area, atau script di index.html.</p>
      </div>

      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-row"
        :class="msg.role"
      >
        <div v-if="msg.role === 'user'" class="user-container">
          <div class="user-bubble">
            {{ msg.content }}
          </div>
          <span v-if="msg.timestamp" class="msg-time">{{ formatTime(msg.timestamp) }}</span>
        </div>

        <div v-else class="assistant-content">
          <div v-if="msg.content" class="assistant-bubble">
            <div class="msg-markdown" v-html="renderMarkdown(msg.content)"></div>
            <div class="msg-footer">
              <button
                @click="copyContent(msg.id, msg.content)"
                class="copy-btn"
                :title="copiedId === msg.id ? 'Tersalin' : 'Salin respon'"
              >
                <Check v-if="copiedId === msg.id" :size="12" class="copied-icon" />
                <Copy v-else :size="12" />
              </button>
              <span v-if="msg.timestamp" class="msg-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>
          <div v-if="msg.toolStatus && isStreaming" class="tool-status">
            <span class="tool-dot"></span>
            <span class="tool-name">Menjalankan: {{ msg.toolStatus }}...</span>
          </div>
          <div v-else-if="!msg.content && isStreaming" class="typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Minimalist Input -->
    <div class="input-area">
      <div class="input-context-bar">
        <button
          type="button"
          class="time-chip-btn"
          @mousedown.prevent
          @click="insertTimeContext"
          :title="`Sisipkan ${timeChipTag} ke posisi kursor`"
        >
          <span>+ {{ timeChipDisplay }}</span>
        </button>
      </div>

      <div class="input-card">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          @input="adjustTextareaHeight"
          @keydown="handleKeyDown"
          placeholder="Minta perbaikan ke Claude..."
          rows="1"
          class="chat-textarea"
        />
        <div class="input-footer">
          <span v-if="isStreaming" class="status-streaming">Claude sedang merespons...</span>
          <span v-else class="status-hint">Enter kirim</span>

          <button
            v-if="!isStreaming"
            type="button"
            @click="handleSend"
            :disabled="!inputText.trim()"
            class="send-btn"
            title="Kirim (Enter)"
          >
            <ArrowUp :size="13" />
          </button>
          <button
            v-else
            type="button"
            @click.stop="stopGeneration"
            class="stop-btn"
            title="Hentikan pembuatan"
          >
            <Square :size="11" />
            <span>Stop</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--panel);
  position: relative;
}

.floating-new-chat-btn {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 10;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--raised);
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: var(--radius);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: all 0.15s ease;
}

.floating-new-chat-btn:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--accent);
  background: var(--panel);
}

.floating-new-chat-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-dim);
  padding: 20px;
}
.empty-icon { margin-bottom: 8px; opacity: 0.6; color: var(--accent); }
.empty-text { font-size: 11px; line-height: 1.5; }

.message-row { display: flex; width: 100%; }
.message-row.user { justify-content: flex-end; }

.user-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  max-width: 85%;
}

.user-bubble {
  width: 100%;
  background: var(--raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text);
  word-break: break-word;
}

.assistant-content {
  width: 100%;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text);
  padding: 2px 0;
}

.assistant-bubble {
  position: relative;
  width: 100%;
}

.msg-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  padding: 0;
}

.copy-btn:hover {
  background: var(--raised);
  color: var(--text);
  border-color: var(--border-strong);
}

.copied-icon {
  color: var(--ok);
}

.msg-time {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text-dim);
  opacity: 0.65;
}

.msg-markdown {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text);
  word-break: break-word;
  user-select: text;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.msg-markdown :deep(p) {
  margin-bottom: 8px;
}

.msg-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.msg-markdown :deep(strong) {
  font-weight: 600;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

.msg-markdown :deep(em) {
  font-style: italic;
}

.msg-markdown :deep(ul),
.msg-markdown :deep(ol) {
  padding-left: 18px;
  margin: 4px 0 8px 0;
}

.msg-markdown :deep(li) {
  margin-bottom: 3px;
}

.msg-markdown :deep(code) {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--raised);
  border: 1px solid var(--border);
  padding: 1px 4px;
  border-radius: var(--radius);
  color: var(--accent);
}

.msg-markdown :deep(pre) {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px;
  margin: 8px 0;
  overflow-x: auto;
}

.msg-markdown :deep(pre code) {
  background: transparent;
  border: none;
  padding: 0;
  color: var(--text);
  font-size: 11px;
  white-space: pre;
}

.msg-markdown :deep(blockquote) {
  border-left: 2px solid var(--accent);
  margin: 6px 0;
  padding-left: 8px;
  color: var(--text-dim);
}

.tool-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-dim);
  padding: 2px 0;
}

.tool-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--accent);
  flex-shrink: 0;
  animation: pulse 1.2s infinite ease-in-out;
}
.tool-name { font-family: var(--font-mono); font-size: 11px; color: var(--accent); }

.typing-indicator { display: inline-flex; align-items: center; gap: 4px; padding: 4px 0; }
.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--accent);
  animation: pulse 1.2s infinite ease-in-out;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.1); }
}

.input-area { padding: 10px; border-top: 1px solid var(--border); background: var(--panel); flex-shrink: 0; }

.input-context-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.time-chip-btn {
  display: inline-flex;
  align-items: center;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: var(--radius);
  font-size: 11px;
  font-family: var(--font-mono);
  padding: 2px 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.time-chip-btn:hover:not(:disabled) {
  color: var(--text);
  background: var(--raised);
  border-color: var(--border-strong);
}

.time-chip-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-card {
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 8px;
  gap: 6px;
}
.input-card:focus-within { border-color: var(--accent); }

.chat-textarea {
  width: 100%;
  min-height: 24px;
  max-height: 150px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: inherit;
  font-size: 12px;
  line-height: 1.45;
  resize: none;
  padding: 0;
  overflow-y: auto;
}

.input-footer { display: flex; align-items: center; justify-content: space-between; }
.status-hint, .status-streaming { font-size: 10px; color: var(--text-dim); }
.status-streaming { color: var(--accent); }

.send-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  border: none;
  color: #fff;
  border-radius: var(--radius);
  cursor: pointer;
}
.send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.stop-btn {
  height: 22px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
  border-radius: var(--radius);
  font-size: 11px;
  cursor: pointer;
}
</style>
