<script setup lang="ts">
import { computed } from 'vue';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Music2,
  Search,
  Plus,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-vue-next';
import type { PlatformPreset } from '../../composables/useSafeArea';

const props = defineProps<{
  preset: PlatformPreset;
}>();

const platform = computed(() => props.preset);
</script>

<template>
  <div class="platform-mockup" :class="`platform-${platform}`">
    <!-- Top Bar Mockup -->
    <div class="mockup-header">
      <div v-if="platform === 'tiktok'" class="tt-header">
        <span class="live-tag">LIVE</span>
        <div class="tt-tabs">
          <span class="tab dim">Mengikuti</span>
          <span class="tab active">Untuk Anda</span>
        </div>
        <Search :size="48" class="icon" />
      </div>

      <div v-else-if="platform === 'shorts'" class="yt-header">
        <span class="shorts-logo">Shorts</span>
        <div class="yt-header-right">
          <Search :size="52" class="icon" />
          <MoreVertical :size="52" class="icon" />
        </div>
      </div>

      <div v-else-if="platform === 'reels'" class="ig-header">
        <span class="reels-title">Reels (Meta)</span>
        <div class="ig-header-right">
          <Search :size="52" class="icon" />
        </div>
      </div>

      <div v-else class="universal-header">
        <span class="badge-tag">UNIVERSAL SAFE AREA</span>
      </div>
    </div>

    <!-- Right Interaction Buttons (Like, Comment, Share) -->
    <div class="mockup-right-col">
      <!-- TikTok Buttons -->
      <template v-if="platform === 'tiktok' || platform === 'universal'">
        <div class="avatar-wrap">
          <div class="avatar-circle"></div>
          <div class="avatar-plus"><Plus :size="20" stroke-width="3" /></div>
        </div>
        <div class="action-btn">
          <Heart :size="54" fill="white" />
          <span class="action-num">124.5K</span>
        </div>
        <div class="action-btn">
          <MessageCircle :size="54" fill="white" />
          <span class="action-num">1,820</span>
        </div>
        <div class="action-btn">
          <Bookmark :size="54" fill="white" />
          <span class="action-num">24.1K</span>
        </div>
        <div class="action-btn">
          <Share2 :size="54" fill="white" />
          <span class="action-num">6,430</span>
        </div>
        <div class="music-disc">
          <Music2 :size="32" />
        </div>
      </template>

      <!-- YouTube Shorts Buttons -->
      <template v-else-if="platform === 'shorts'">
        <div class="action-btn">
          <ThumbsUp :size="54" fill="white" />
          <span class="action-num">89K</span>
        </div>
        <div class="action-btn">
          <ThumbsDown :size="54" />
          <span class="action-num">Tidak suka</span>
        </div>
        <div class="action-btn">
          <MessageCircle :size="54" fill="white" />
          <span class="action-num">952</span>
        </div>
        <div class="action-btn">
          <Share2 :size="54" fill="white" />
          <span class="action-num">Bagikan</span>
        </div>
        <div class="action-btn">
          <Music2 :size="50" />
          <span class="action-num">Remix</span>
        </div>
      </template>

      <!-- Instagram Reels Buttons -->
      <template v-else-if="platform === 'reels'">
        <div class="action-btn">
          <Heart :size="54" />
          <span class="action-num">45.2K</span>
        </div>
        <div class="action-btn">
          <MessageCircle :size="54" />
          <span class="action-num">824</span>
        </div>
        <div class="action-btn">
          <Share2 :size="54" />
        </div>
        <div class="action-btn">
          <MoreVertical :size="48" />
        </div>
      </template>
    </div>

    <!-- Bottom Caption & Account Info -->
    <div class="mockup-bottom">
      <div class="account-row">
        <span class="account-name">@akuncreator</span>
        <button v-if="platform === 'shorts'" class="yt-sub-btn">Subscribe</button>
      </div>
      <div class="caption-text">
        Judul video dan keterangan postingan 2-3 baris yang biasanya menutupi teks bagian bawah... #shorts #motion
      </div>
      <div class="audio-track">
        <Music2 :size="28" />
        <span class="audio-title">Audio Asli - kreator</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.platform-mockup {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
  opacity: 0.65;
  transition: opacity 150ms ease;
}

.platform-mockup:hover {
  opacity: 0.85;
}

/* Header UI */
.mockup-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 40px 48px;
}

.tt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.live-tag {
  font-size: 28px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 16px;
  border-radius: 8px;
}

.tt-tabs {
  display: flex;
  gap: 32px;
  font-size: 36px;
  font-weight: 700;
}

.tt-tabs .tab.dim {
  opacity: 0.6;
}

.yt-header,
.ig-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shorts-logo,
.reels-title {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.yt-header-right,
.ig-header-right {
  display: flex;
  gap: 32px;
  align-items: center;
}

.universal-header {
  display: flex;
  justify-content: center;
}

.badge-tag {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.08em;
  background: rgba(91, 141, 239, 0.9);
  padding: 6px 20px;
  border-radius: 6px;
}

/* Right Side Column */
.mockup-right-col {
  position: absolute;
  right: 28px;
  bottom: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
}

.avatar-wrap {
  position: relative;
  margin-bottom: 8px;
}

.avatar-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  border: 4px solid #ffffff;
  background-color: rgba(255, 255, 255, 0.4);
}

.avatar-plus {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #fe2c55;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
}

.action-num {
  font-size: 24px;
  font-weight: 700;
}

.music-disc {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #111111;
  border: 14px solid #222222;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Bottom Section */
.mockup-bottom {
  position: absolute;
  left: 48px;
  right: 180px;
  bottom: 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.account-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.account-name {
  font-size: 34px;
  font-weight: 700;
}

.yt-sub-btn {
  background: #ffffff;
  color: #000000;
  border: none;
  font-size: 26px;
  font-weight: 700;
  padding: 8px 24px;
  border-radius: 40px;
}

.caption-text {
  font-size: 28px;
  line-height: 1.35;
  font-weight: 500;
  opacity: 0.95;
}

.audio-track {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 26px;
  opacity: 0.85;
}
</style>

