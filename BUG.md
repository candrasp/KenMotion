# BUG.md — Laporan Audit Menyeluruh Bug KenMotion

> Audit mendalam menyeluruh arsitektur, backend (Hono + Bun), frontend (Vue 3 + Vite), services, dan security per 2026-11-07.  
> Status TypeScript: **bersih** (`vue-tsc --noEmit` & `tsc --noEmit` exit code 0).

---

## 🔴 KRITIKAL (Stabilitas Sistem, Deadlock, Resource Leak & Security)

### BUG-01 · [SELESAI] Browser Chromium Zombie saat `cancelRender()`
**File:** [`apps/server/src/services/render/render.service.ts`](file:///i:/Bun/KenMotion/apps/server/src/services/render/render.service.ts#L25-L30)  
**Status:** ✅ Selesai diperbaiki. Instance `browser` disimpan pada `activeJob` dan ditutup via `activeJob.browser.close()` saat `cancelRender()`.

---

### BUG-02 · [SELESAI] Penumpukan File Sementara `temp-video-*.mp4` (Disk Leak)
**File:** [`apps/server/src/services/render/render.service.ts`](file:///i:/Bun/KenMotion/apps/server/src/services/render/render.service.ts#L57-L59)  
**Status:** ✅ Selesai diperbaiki. `tempVideoPath` otomatis dibersihkan dengan `rmSync` saat proses dibatalkan, saat audio mixing rampung, atau jika terjadi error pada blok `catch`.

---

### BUG-03 · [SELESAI] Deadlock Chat (`session.isRunning` terkunci permanen jika proses crash)
**File:** [`apps/server/src/services/claude.service.ts`](file:///i:/Bun/KenMotion/apps/server/src/services/claude.service.ts#L199-L252)  
**Status:** ✅ Selesai diperbaiki. Seluruh pembacaan stream proses dibungkus blok `try ... finally` yang menjamin `session.isRunning = false` dan `session.activeProcess = undefined` pasti dieksekusi.

---

### BUG-04 · [SELESAI] Path Traversal Vulnerability pada `extractVideoFrames`
**File:** [`apps/server/src/services/import.service.ts`](file:///i:/Bun/KenMotion/apps/server/src/services/import.service.ts#L12)  
**Status:** ✅ Selesai diperbaiki. `videoPath` di-resolve terhadap `assetsDir` dan divalidasi dengan `videoPath.startsWith(assetsDir)` serta pengecekan `statSync.isFile()`.

---

### BUG-05 · [SELESAI] Browser Chromium Zombie saat Checker Error / Crash
**File:** [`apps/server/src/services/checker/checker.service.ts`](file:///i:/Bun/KenMotion/apps/server/src/services/checker/checker.service.ts#L53-L230)  
**Status:** ✅ Selesai diperbaiki. Seluruh alur inspeksi Playwright dibungkus dalam `try ... finally { await browser.close(); }`.

---

### BUG-06 · [SELESAI] URL-Encoding Bug pada Serving Aset Proyek & Library (404 pada File Berspasi)
**File:** [`apps/server/src/routes/projects.ts`](file:///i:/Bun/KenMotion/apps/server/src/routes/projects.ts#L49-L55) dan [`apps/server/src/routes/library.ts`](file:///i:/Bun/KenMotion/apps/server/src/routes/library.ts#L22-L24)  
**Status:** ✅ Selesai diperbaiki. Ditambahkan `decodeURIComponent()` pada wildcard route sebelum memanggil file path resolver.

---

## 🟠 SERIUS (Fungsionalitas Rusak / Desync State)

### BUG-07 · [SELESAI] UI Render Terkunci / Rusak saat Tahap Audio Mixing
**File:** [`apps/web/src/components/render/RenderPanel.vue`](file:///i:/Bun/KenMotion/apps/web/src/components/render/RenderPanel.vue#L18)  
**Status:** ✅ Selesai diperbaiki. `isRendering` kini memperhitungkan status `'rendering'` dan `'mixing'`, serta menambahkan label "Mixing audio...".

---

### BUG-08 · [SELESAI] `duration` Tidak Di-reset saat Berpindah Proyek
**File:** [`apps/web/src/App.vue`](file:///i:/Bun/KenMotion/apps/web/src/App.vue#L57-L59)  
**Status:** ✅ Selesai diperbaiki. `duration.value` selalu diupdate ke `lastScene.end` proyek baru dan `currentTime.value` di-reset ke 0 saat berganti proyek.

---

### BUG-09 · [SELESAI] SSE Stream Parsing Gagal di Windows pada `useRender.ts`
**File:** [`apps/web/src/composables/useRender.ts`](file:///i:/Bun/KenMotion/apps/web/src/composables/useRender.ts#L41)  
**Status:** ✅ Selesai diperbaiki. Parsing SSE menggunakan regex `/\r?\n\r?\n/` dan baris `/\r?\n/` untuk mendukung Windows CRLF.

---

### BUG-10 · [SELESAI] Hardcoded Project Name pada Fallback Narasi Audio
**File:** [`apps/server/src/services/audio/audio.service.ts`](file:///i:/Bun/KenMotion/apps/server/src/services/audio/audio.service.ts#L46)  
**Status:** ✅ Selesai diperbaiki. Deteksi file narasi kini memeriksa kandidat standar dan fallback dinamis ke file audio pertama di `assets/` tanpa hardcode nama file tertentu.

---

### BUG-11 · [SELESAI] Desynchronization Tipe TypeScript antara Frontend dan Backend
**File:** [`apps/web/src/lib/types.ts`](file:///i:/Bun/KenMotion/apps/web/src/lib/types.ts)  
**Status:** ✅ Selesai diperbaiki. Tipe `AudioCue`, `AudioManifest`, dan `AudioInspectionIssue` telah disinkronkan secara lengkap.

---

### BUG-12 · [SELESAI] Subtitle Milliseconds Salah Hitung pada `parseSrt`
**File:** [`apps/server/src/services/fixes.service.ts`](file:///i:/Bun/KenMotion/apps/server/src/services/fixes.service.ts#L48-L53)  
**Status:** ✅ Selesai diperbaiki. Perhitungan milidetik menggunakan pecahan desimal `parseFloat('0.' + ms)` yang tepat untuk 1, 2, atau 3 digit.

---

## 🟡 PERINGATAN & DEFECT KECIL

### BUG-13 · [SELESAI] Tipe Finding Audio di Checker Selalu Ter-hardcode `'base64_found'`
**File:** [`apps/server/src/services/checker/checker.service.ts`](file:///i:/Bun/KenMotion/apps/server/src/services/checker/checker.service.ts#L236)  
**Status:** ✅ Selesai diperbaiki. Isu audio kini dipetakan dengan benar ke `'timing'` (overlap/duration) atau `'audio_issue'`, dan tipe union `CheckFinding` diperbarui di backend dan frontend.

---

### BUG-14 · [SELESAI] Lack of HTTP Range Headers pada Penyajian Video & Audio
**File:** [`apps/server/src/routes/projects.ts`](file:///i:/Bun/KenMotion/apps/server/src/routes/projects.ts) dan [`apps/server/src/routes/library.ts`](file:///i:/Bun/KenMotion/apps/server/src/routes/library.ts)  
**Status:** ✅ Selesai diperbaiki. Dibuat modul bersama `apps/server/src/lib/file-response.ts` dengan dukungan HTTP 206 Partial Content (HTTP Range) dan native streaming via `Bun.file()`.

---

### BUG-15 · [SELESAI] No-Op Expression di `render.service.ts`
**File:** [`apps/server/src/services/render/render.service.ts`](file:///i:/Bun/KenMotion/apps/server/src/services/render/render.service.ts)  
**Status:** ✅ Selesai diperbaiki. Baris no-op `finalOutputPath.length;` telah dihapus.

---

### BUG-16 · [SELESAI] Module-level AudioContext Tidak Pernah Ditutup
**File:** [`apps/web/src/composables/useAudio.ts`](file:///i:/Bun/KenMotion/apps/web/src/composables/useAudio.ts)  
**Status:** ✅ Selesai diperbaiki. Ditambahkan pembersihan buffer audio antar proyek serta fungsi `resetAudio()` dan `closeAudioContext()`.

---

## Ringkasan Matriks Bug

| ID | Kategori | Komponen / File | Dampak Utama |
|---|---|---|---|
| **BUG-01** | 🔴 Kritikal | `render.service.ts` | [SELESAI] Zombie Chromium saat Cancel Render (Memory leak) |
| **BUG-02** | 🔴 Kritikal | `render.service.ts` | [SELESAI] File sampah `temp-video` tidak dihapus (Disk leak) |
| **BUG-03** | 🔴 Kritikal | `claude.service.ts` | [SELESAI] Chat Claude terkunci permanen jika subprocess crash |
| **BUG-04** | 🔴 Kritikal | `import.service.ts` | [SELESAI] Path Traversal membaca file arbitrer via `extractVideoFrames` |
| **BUG-05** | 🔴 Kritikal | `checker.service.ts` | [SELESAI] Zombie Chromium jika pengecekan HTML melempar exception |
| **BUG-06** | 🔴 Kritikal | `projects.ts` & `library.ts` | [SELESAI] Aset dengan nama berspasi selalu 404 (URL-encoding) |
| **BUG-07** | 🟠 Serius | `RenderPanel.vue` | [SELESAI] UI Render glitch & tidak bisa dibatalkan saat tahap Audio Mixing |
| **BUG-08** | 🟠 Serius | `App.vue` | [SELESAI] Durasi timeline tidak reset saat pindah ke proyek yang lebih pendek |
| **BUG-09** | 🟠 Serius | `useRender.ts` | [SELESAI] Parse SSE render gagal di Windows karena CRLF |
| **BUG-10** | 🟠 Serius | `audio.service.ts` | [SELESAI] Hardcode nama file `nyetok-makanan.mp3` proyek demo |
| **BUG-11** | 🟠 Serius | `types.ts` | [SELESAI] Desinkronisasi tipe TypeScript audio manifest & cue |
| **BUG-12** | 🟠 Serius | `fixes.service.ts` | [SELESAI] Subtitle SRT desync hingga 450ms akibat parsing 2-digit ms |
| **BUG-13** | 🟡 Peringatan | `checker.service.ts` | [SELESAI] Tipe isu audio di-hardcode ke `'base64_found'` |
| **BUG-14** | 🟡 Peringatan | `projects.ts` & `library.ts` | [SELESAI] Streaming media tanpa HTTP 206 Range headers |
| **BUG-15** | 🟡 Peringatan | `render.service.ts` | [SELESAI] Kode mati no-op `finalOutputPath.length` |
| **BUG-16** | 🟡 Peringatan | `useAudio.ts` | [SELESAI] Singleton AudioContext tanpa mekanisme dispose/close |
