import { ref } from 'vue';
import type { AudioManifest, AudioCue } from '../lib/types';

const manifest = ref<AudioManifest | null>(null);
let audioCtx: AudioContext | null = null;

let narasiBuffer: AudioBuffer | null = null;
let musikBuffer: AudioBuffer | null = null;
const sfxBuffers = new Map<string, AudioBuffer>();

let narasiSource: AudioBufferSourceNode | null = null;
let musikSource: AudioBufferSourceNode | null = null;
let masterGainNode: GainNode | null = null;

const volume = ref<number>(1);
const isMuted = ref<boolean>(false);

const sfxPlayed = new Set<string>();

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getMasterGain(): GainNode {
  const ctx = getAudioContext();
  if (!masterGainNode) {
    masterGainNode = ctx.createGain();
    masterGainNode.gain.value = isMuted.value ? 0 : volume.value;
    masterGainNode.connect(ctx.destination);
  }
  return masterGainNode;
}

function updateMasterGain(): void {
  if (masterGainNode) {
    masterGainNode.gain.value = isMuted.value ? 0 : volume.value;
  }
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  try {
    const ctx = getAudioContext();
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.warn(`Gagal memuat audio: ${url}`, err);
    return null;
  }
}

export function useAudio() {
  const loadAudioManifest = async (projectId: string): Promise<void> => {
    stopAllContinuous();
    narasiBuffer = null;
    musikBuffer = null;
    sfxBuffers.clear();
    sfxPlayed.clear();
    manifest.value = null;

    try {
      const res = await fetch(`/audio/${projectId}/manifest`);
      if (res.ok) {
        manifest.value = (await res.json()) as AudioManifest;

        // Preload narasi
        if (manifest.value.narasiUrl) {
          loadBuffer(manifest.value.narasiUrl).then((b) => (narasiBuffer = b));
        }
        // Preload musik
        if (manifest.value.musikUrl) {
          loadBuffer(manifest.value.musikUrl).then((b) => (musikBuffer = b));
        }
        // Preload SFX
        for (const cue of manifest.value.cues) {
          if (cue.resolvedUrl && !sfxBuffers.has(cue.file)) {
            loadBuffer(cue.resolvedUrl).then((b) => {
              if (b) sfxBuffers.set(cue.file, b);
            });
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat manifest audio:', err);
    }
  };

  const playSFX = (cue: AudioCue): void => {
    const ctx = getAudioContext();
    const master = getMasterGain();
    const buf = sfxBuffers.get(cue.file);
    if (!buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.value = cue.volume || 0.8;

    src.connect(gain);
    gain.connect(master);
    src.start();
  };

  const stopAllContinuous = (): void => {
    if (narasiSource) {
      try { narasiSource.stop(); } catch {}
      narasiSource.disconnect();
      narasiSource = null;
    }
    if (musikSource) {
      try { musikSource.stop(); } catch {}
      musikSource.disconnect();
      musikSource = null;
    }
  };

  const syncPlayback = (isPlaying: boolean, currentTime: number): void => {
    const ctx = getAudioContext();

    if (!isPlaying) {
      stopAllContinuous();
      return;
    }

    stopAllContinuous();

    const master = getMasterGain();

    // Mainkan Narasi dari currentTime
    if (narasiBuffer && currentTime < narasiBuffer.duration) {
      narasiSource = ctx.createBufferSource();
      narasiSource.buffer = narasiBuffer;
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      narasiSource.connect(gain);
      gain.connect(master);
      narasiSource.start(0, currentTime);
    }

    // Mainkan Musik ducked (volume 0.15)
    if (musikBuffer) {
      musikSource = ctx.createBufferSource();
      musikSource.buffer = musikBuffer;
      musikSource.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.15; // Musik ducking di bawah narasi
      musikSource.connect(gain);
      gain.connect(master);
      const musicOffset = currentTime % musikBuffer.duration;
      musikSource.start(0, musicOffset);
    }

    // Reset list played SFX sebelum waktu saat ini
    sfxPlayed.clear();
    if (manifest.value) {
      for (const cue of manifest.value.cues) {
        if (cue.absoluteTime !== undefined && cue.absoluteTime < currentTime) {
          sfxPlayed.add(`${cue.scene}-${cue.file}-${cue.offset}`);
        }
      }
    }
  };

  const checkAndTriggerSFX = (currentTime: number): void => {
    if (!manifest.value) return;

    for (const cue of manifest.value.cues) {
      if (cue.absoluteTime !== undefined) {
        const key = `${cue.scene}-${cue.file}-${cue.offset}`;
        // Trigger jika waktu saat ini pas melewati cue (toleransi 0.08 detik)
        if (
          currentTime >= cue.absoluteTime &&
          currentTime <= cue.absoluteTime + 0.08 &&
          !sfxPlayed.has(key)
        ) {
          sfxPlayed.add(key);
          playSFX(cue);
        }
      }
    }
  };

  const setVolume = (val: number): void => {
    volume.value = Math.max(0, Math.min(1, val));
    if (volume.value > 0 && isMuted.value) {
      isMuted.value = false;
    }
    updateMasterGain();
  };

  const toggleMute = (): void => {
    isMuted.value = !isMuted.value;
    updateMasterGain();
  };

  const resetAudio = (): void => {
    stopAllContinuous();
    narasiBuffer = null;
    musikBuffer = null;
    sfxBuffers.clear();
    sfxPlayed.clear();
    manifest.value = null;
  };

  const closeAudioContext = async (): Promise<void> => {
    resetAudio();
    if (audioCtx && audioCtx.state !== 'closed') {
      try {
        await audioCtx.close();
      } catch {}
      audioCtx = null;
      masterGainNode = null;
    }
  };

  return {
    manifest,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    loadAudioManifest,
    syncPlayback,
    checkAndTriggerSFX,
    stopAllContinuous,
    resetAudio,
    closeAudioContext,
  };
}

