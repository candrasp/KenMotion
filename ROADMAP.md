# ROADMAP: Motion Checker & Renderer

Aplikasi untuk memeriksa, memperbaiki, dan merender HTML motion hasil agen Claude (dari `storyboard.md`) menjadi mp4.

**Stack:** Bun, Vue 3 + Vite, Hono, Playwright (Chromium), ffmpeg (sudah terpasang), `lucide-vue-next`, Claude CLI (untuk panel chat)

**Prinsip:**
- Satu sumber kebenaran: HTML asli tidak diedit langsung. Perbaikan disimpan di `fixes.json`.
- Tanpa base64. Semua aset berupa file di folder proyek.
- Fungsi dulu, desain belakangan.
- Jangan lanjut ke tahap berikutnya sebelum tahap sebelumnya benar-benar jalan.

---

## Tahap 0: Fondasi
- [x] Cek `ffmpeg -version` dan `ffprobe -version`
- [x] Monorepo: `apps/web` (Vue) dan `apps/server` (Hono)
- [x] Pasang `lucide-vue-next`
- [x] Pasang Playwright: `bunx playwright install chromium`
- [x] Taruh `SPEC.md` di root proyek
- [x] Uji spec: minta Claude membuat ulang `ted.html` sesuai `SPEC.md`

**Selesai kalau:** HTML hasil Claude memenuhi spec (punya `data-scene`, `__seek`, `__duration`).

## Tahap 1: Preview
- [x] Hono menyajikan folder proyek dan aset (`/projects/:id/*`)
- [x] Iframe preview dengan skala otomatis ke layar
- [x] Playhead, scrubber, play/pause (`Play`, `Pause`, `SkipBack`, `SkipForward`)
- [x] Parser `storyboard.md` menjadi blok scene di timeline
- [x] Snap ke frame, dan lompat antar scene

**Selesai kalau:** menggeser playhead menampilkan scene yang benar.

## Tahap 2: Pemeriksa slop
- [x] Playwright seek ke tiap scene, lalu screenshot
- [x] Cek: teks meluber, keluar canvas, teks ≠ script, timing meleset, scene kosong, font gagal muat
- [x] Panel temuan per scene (`TriangleAlert`, `CircleCheck`)
- [x] Tombol salin prompt perbaikan untuk Claude (`Copy`)

**Selesai kalau:** `ted.html` menghasilkan daftar temuan yang masuk akal.

## Tahap 3: Render
- [x] Screenshot per frame, lalu pipe ke ffmpeg (mp4 tanpa audio)
- [x] Progress bar dan tombol batal
- [x] Batasi concurrency 1 sampai 2 tab (RAM 8 GB)

**Selesai kalau:** mp4 bisa diputar dan durasinya sesuai.

## Tahap 4: Audio
- [x] Track narasi, lalu musik, lalu SFX
- [x] Preview lewat Web Audio API, dengan waveform
- [x] Import `cues.json` (terpisah), dipetakan ke scene
- [x] Ducking musik, dan mixing di ffmpeg
- [x] Pemeriksa: SFX tanpa file, cue menumpuk, musik lebih pendek dari video, clipping

**Selesai kalau:** suara sinkron dengan visual di preview dan hasil render.

## Tahap 5: Perbaikan dan import
- [x] Edit teks, posisi, dan timing lewat `fixes.json`
- [x] Import SRT
- [x] Import gambar dan video (ekstrak frame via ffmpeg)

## Tahap 5b: Panel chat (Claude CLI)
- [x] Bridge Hono ke CLI: spawn di folder proyek, prompt lewat **stdin** (`claude.cmd` di Windows)
- [x] Flag dasar: `-p --output-format stream-json --include-partial-messages`
- [x] Teruskan stream ke Vue lewat SSE, dan urai tiap baris JSON
- [x] Sesi per project ID
- [x] Sistem prompt mengikutsertakan `SPEC.md`
- [x] UI chat (`MessageSquare`, `ArrowUp`, `Square`): daftar pesan, tombol kirim/stop
- [x] Integrasi Right Sidebar dengan 3 tab (Chat, Pemeriksa, Inspector)

**Selesai kalau:** kamu bisa meminta Claude memperbaiki satu temuan dari chat, preview berubah otomatis, dan perubahan bisa dibatalkan.

## Tahap 6: Poles UI
- [ ] Tema dark, Inter + JetBrains Mono, ikon Lucide konsisten
- [ ] Shortcut keyboard (Space, panah kiri/kanan)
- [ ] Pesan error yang ramah

## Tahap 7: Hardening & Ketahanan Sistem (Production Polish)
- [ ] Orphan process guard: pembersihan proses Playwright dan ffmpeg pada sinyal shutdown server (`SIGINT`/`SIGTERM`)
- [ ] Error boundary pada iframe preview: tangkap fatal syntax/runtime JS error pada HTML motion dengan pesan ramah
- [ ] Manajemen disk & retensi ekspor: opsi pembersihan file render lama di folder `out/`
- [ ] Test otomatis (`bun test`): unit test untuk parser storyboard, kalkulasi audio manifest, dan override fixes

---

## Struktur proyek yang disarankan

```
project/
├── storyboard.md
├── index.html        # hasil Claude
├── cues.json         # cue SFX
├── fixes.json        # override perbaikan
├── assets/           # gambar, video, audio, font, gsap
└── out/              # hasil render
```

## Catatan
- Preview cepat lebih penting daripada render cepat.
- Tahap 1 dan 2 sudah memberi manfaat nyata. Mulai pakai aplikasi di sana.
- Commit atau beri tag tiap tahap, supaya mudah kembali kalau macet.
