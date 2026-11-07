# GEMINI.md

Aturan kerja untuk agen di proyek **Motion Checker & Renderer** (Bun, Vue 3 + Vite, Hono, Playwright, ffmpeg, Lucide). Lingkungan: Windows.

## 1. Dokumen acuan (baca hanya bagian yang relevan)
- `ROADMAP.md`: urutan tahap dan status. Kerjakan **satu tahap sekali**.
- `SPEC.md`: kontrak HTML motion (`data-scene`, `__seek`, `__duration`).
- `DESIGN.md`: token, komponen, dan tata letak UI.
- Jangan membaca ulang seluruh dokumen setiap giliran. Buka bagian yang dibutuhkan saja.

## 2. Hemat token
- Jangan membaca seluruh file. Cari dengan grep atau pencarian dulu, lalu baca rentang baris yang perlu.
- Jangan membaca ulang file yang baru saja kamu tulis atau baca.
- Edit dengan perubahan kecil dan terarah. Jangan menulis ulang seluruh file untuk perubahan kecil.
- Jangan mengulang kode di jawaban. Cukup sebut file dan apa yang berubah.
- Jawaban singkat: maksimal 5 baris ringkasan setelah selesai. Tanpa basa-basi dan tanpa penjelasan yang tidak diminta.
- Jangan menambah fitur, refactor, atau dokumentasi yang tidak diminta.

## 3. Fokus
- Kerjakan hanya yang diminta. Satu tugas, satu fokus.
- Kalau permintaan ambigu atau ada keputusan arsitektur penting, **tanya dulu** (satu pertanyaan singkat), jangan menebak.
- Kalau menemukan masalah di luar tugas, catat dalam satu baris di akhir jawaban. Jangan diperbaiki sendiri.
- Tandai checklist di `ROADMAP.md` hanya setelah pekerjaannya benar-benar selesai.

## 4. Dilarang tanpa diminta
Jangan menjalankan perintah berikut kecuali saya meminta secara eksplisit:
- `bun run dev`, `bun run build`, `bun run start`, `vite`, atau server apa pun yang berjalan terus
- `bun install` / `bun add` / `bun remove` (tanya dulu paket apa dan alasannya)
- `bunx playwright install`, perintah render, atau ffmpeg yang memproses video
- `git commit`, `git push`, `git reset`, atau perintah git yang mengubah riwayat
- Menghapus file atau folder

Saya yang menjalankan dan menguji aplikasinya. Jangan membuka browser atau mengambil screenshot sendiri.

## 5. Wajib setelah coding: cek TypeScript
Setelah selesai mengubah kode, jalankan **hanya** pengecekan ini:

```
bun run typecheck
```

Script `typecheck` di `package.json`:
- `apps/web`: `vue-tsc --noEmit`
- `apps/server`: `tsc --noEmit`

Aturan:
- Perbaiki semua error sebelum menyatakan tugas selesai.
- Jangan membungkam error dengan `any`, `@ts-ignore`, `@ts-expect-error`, atau `as unknown as`. Perbaiki tipenya.
- Kalau error tidak bisa diperbaiki tanpa keputusan dariku, jelaskan singkat dan tanyakan.
- Laporkan hasilnya satu baris: `Typecheck: bersih` atau daftar error yang tersisa.

## 6. Clean code
- **Satu file, satu tanggung jawab.** Jangan menumpuk CSS atau TS dalam satu file besar. Pecah per komponen dan fungsi. Target maksimal sekitar 200 baris per file, dan 300 sebagai batas keras.
- TypeScript `strict`. Tipe eksplisit untuk parameter dan nilai kembali fungsi publik.
- Nama jelas dan deskriptif (bahasa Inggris untuk kode, bahasa Indonesia untuk teks UI). Tanpa singkatan yang membingungkan.
- Fungsi pendek dan satu tujuan. Hindari nesting dalam (maksimal 3 tingkat), gunakan early return.
- Tanpa kode mati, `console.log` sisa debug, dan komentar yang hanya mengulang kode. Komentar hanya untuk menjelaskan **alasan**.
- Tanpa angka dan string ajaib. Pindahkan ke konstanta bernama.
- Jangan menduplikasi logika. Ambil ke fungsi bersama bila dipakai lebih dari dua kali.
- Tangani error di batas sistem (file, jaringan, proses). Pesan error ramah dan jelas.
- Impor ikon Lucide satu per satu (tree-shaking).

## 7. Aturan Vue
- Gunakan `<script setup lang="ts">` dan Composition API.
- Logika yang bukan tampilan dipindah ke `composables/` atau `lib/`.
- State bersama lewat composable atau store kecil, bukan prop berantai.
- Warna dan jarak hanya dari token di `tokens.css` (lihat `DESIGN.md`). Tanpa hex langsung di komponen.

## 8. Aturan server (Hono)
- Satu file route per area (`projects`, `render`, `chat`). Logika berat di `services/`.
- Validasi input di batas route.
- Hanya dengar di `127.0.0.1`. Jangan dibuka ke jaringan.
- Aset tidak boleh jadi base64. Sajikan sebagai file.

## 9. Struktur
```
apps/
├── web/      # Vue: components/, composables/, lib/, styles/ (tokens.css)
└── server/   # Hono: routes/, services/, lib/
```
Ikuti struktur ini. Tanya dulu sebelum membuat folder tingkat atas baru.

## 10. Format jawaban setelah selesai
```
Selesai: <satu kalimat>
File: <daftar file yang berubah>
Typecheck: bersih
Catatan: <hanya jika ada, satu baris>
```
