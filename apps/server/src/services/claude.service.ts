import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getProjectsRoot } from './project.service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  timestamp: number;
}

export interface ChatSession {
  sessionId: string;
  projectId: string;
  messages: ChatMessage[];
  isRunning: boolean;
  activeProcess?: ReturnType<typeof Bun.spawn>;
}

const activeSessions = new Map<string, ChatSession>();

function getChatFilePath(projectId: string): string {
  return join(getProjectsRoot(), projectId, '.chat.json');
}

function loadChatHistory(projectId: string): ChatMessage[] {
  const filePath = getChatFilePath(projectId);
  if (!existsSync(filePath)) return [];
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function saveChatHistory(projectId: string, messages: ChatMessage[]): void {
  const filePath = getChatFilePath(projectId);
  try {
    writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menyimpan riwayat chat:', err);
  }
}

export function getOrCreateSession(projectId: string): ChatSession {
  let session = Array.from(activeSessions.values()).find((s) => s.projectId === projectId);
  if (!session) {
    const sessionId = crypto.randomUUID();
    session = {
      sessionId,
      projectId,
      messages: loadChatHistory(projectId),
      isRunning: false,
    };
    activeSessions.set(sessionId, session);
  } else if (!session.isRunning) {
    session.messages = loadChatHistory(projectId);
  }
  return session;
}

export function stopSession(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (session && session.activeProcess) {
    try {
      session.activeProcess.kill();
    } catch {}
    session.isRunning = false;
    session.activeProcess = undefined;
    return true;
  }
  return false;
}

export function clearSession(projectId: string): void {
  const session = Array.from(activeSessions.values()).find((s) => s.projectId === projectId);
  if (session) {
    if (session.activeProcess) {
      try {
        session.activeProcess.kill();
      } catch {}
    }
    session.isRunning = false;
    session.activeProcess = undefined;
    session.messages = [];
    session.sessionId = crypto.randomUUID();
  }
  saveChatHistory(projectId, []);
}

function parseLine(
  line: string,
  assistantTextRef: { value: string },
  onEvent: (event: Record<string, unknown>) => void
): void {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;

    if (parsed.type === 'stream_event') {
      const ev = parsed.event as {
        type?: string;
        delta?: { type?: string; text?: string };
      } | undefined;
      if (ev?.type === 'content_block_delta' && ev.delta?.text) {
        assistantTextRef.value += ev.delta.text;
      }
    } else if (parsed.type === 'content_block_delta') {
      const delta = parsed.delta as { type?: string; text?: string } | undefined;
      if (delta?.text) assistantTextRef.value += delta.text;
    } else if (parsed.type === 'assistant') {
      const msg = parsed.message as { content?: Array<{ type: string; text?: string }> } | undefined;
      if (msg?.content) {
        const parts = msg.content
          .filter((c) => c.type === 'text' && typeof c.text === 'string')
          .map((c) => c.text as string)
          .join('');
        if (parts && !assistantTextRef.value) assistantTextRef.value = parts;
      }
    } else if (parsed.type === 'result' && typeof parsed.result === 'string' && parsed.result.trim()) {
      assistantTextRef.value = parsed.result.trim();
    }

    onEvent({ type: 'claude-event', data: parsed });
  } catch {
    onEvent({ type: 'claude-raw', data: trimmed });
  }
}

export function runClaudePrompt(
  session: ChatSession,
  prompt: string,
  onEvent: (event: Record<string, unknown>) => void
): void {
  const projectDir = join(getProjectsRoot(), session.projectId);
  if (!existsSync(projectDir)) {
    throw new Error(`Project directory not found: ${projectDir}`);
  }

  const rootDir = join(getProjectsRoot(), '..');
  const claudeMdPath = join(rootDir, 'CLAUDE.md');
  let claudeMdPrompt = '';
  if (existsSync(claudeMdPath)) {
    claudeMdPrompt = readFileSync(claudeMdPath, 'utf-8');
  }

  const args: string[] = [
    'claude',
    '-p',
    '--output-format', 'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--add-dir', rootDir,
    '--permission-mode', 'acceptEdits',
    '--permission-prompts', 'none',
  ];

  if (session.messages.length > 0) {
    // Sisipkan -c setelah 'claude'
    args.splice(1, 0, '-c');
  }

  if (claudeMdPrompt) {
    args.push('--append-system-prompt', `Patuhi selalu aturan di CLAUDE.md berikut:\n${claudeMdPrompt}`);
  }

  session.isRunning = true;
  session.messages.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: prompt,
    timestamp: Date.now(),
  });
  saveChatHistory(session.projectId, session.messages);

  // Gunakan Bun.spawn — baca stdout native tanpa Node.js pipe-buffering layer
  const proc = Bun.spawn(['cmd', '/c', ...args], {
    cwd: projectDir,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      NO_COLOR: '1',
      FORCE_COLOR: '0',
    },
  });

  session.activeProcess = proc;

  // Kirim prompt via stdin
  void proc.stdin.write(prompt + '\n');
  proc.stdin.end();

  const assistantTextRef = { value: '' };

  // Baca stdout secara async — Bun ReadableStream tidak buffer seperti Node.js pipe
  void (async () => {
    let exitCode = 0;
    try {
      const decoder = new TextDecoder();
      let lineBuffer = '';

      try {
        const reader = proc.stdout.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split(/\r?\n/);
          lineBuffer = lines.pop() ?? '';
          for (const line of lines) {
            parseLine(line, assistantTextRef, onEvent);
          }
        }
        // Flush sisa buffer
        if (lineBuffer.trim()) {
          parseLine(lineBuffer, assistantTextRef, onEvent);
        }
      } catch {
        // Proses di-kill atau koneksi terputus — normal
      }

      // Baca stderr untuk debug
      try {
        const errReader = proc.stderr.getReader();
        let errBuf = '';
        while (true) {
          const { value, done } = await errReader.read();
          if (done) break;
          errBuf += decoder.decode(value, { stream: true });
        }
        if (errBuf.trim()) {
          onEvent({ type: 'claude-stderr', data: errBuf });
        }
      } catch {}

      try {
        exitCode = await proc.exited;
      } catch {
        exitCode = 1;
      }

      if (assistantTextRef.value.trim()) {
        session.messages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: assistantTextRef.value.trim(),
          timestamp: Date.now(),
        });
        saveChatHistory(session.projectId, session.messages);
      }
    } finally {
      session.isRunning = false;
      session.activeProcess = undefined;
      onEvent({ type: 'done', code: exitCode });
    }
  })();
}
