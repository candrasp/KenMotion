# SPEC: Kontrak HTML Motion

Dokumen ini adalah aturan wajib untuk agen (Claude) yang mengubah `storyboard.md` menjadi HTML motion. Aplikasi pemeriksa dan renderer hanya bisa bekerja kalau aturan ini dipatuhi.

## 1. Prinsip
- Animasi harus **deterministik dan bisa di-seek**: tampilan pada waktu `t` selalu sama, tanpa bergantung pada jam nyata.
- Satu file `index.html`. Aset berada langsung di folder `assets/` (struktur flat tanpa subfolder) dengan path relatif.
- **Dilarang base64** untuk gambar, font, audio, dan video.

## 2. Canvas
- Ukuran tetap **1080 × 1920** (9:16), elemen `#stage`.
- `#stage` memakai `position:absolute; left:0; top:0; overflow:hidden`.
- Skala ke layar dilakukan oleh aplikasi, bukan oleh HTML. Jangan memakai `vh`/`vw`.
- **Safe area:** teks penting dan subjudul wajib berada di dalam batas aman. Lihat panduan lengkap di [`SAFE-AREA.md`](./SAFE-AREA.md) (Universal Safe Area: margin atas 180px, bawah 340px, kiri 60px, kanan 140px).

## 3. Scene
Setiap scene storyboard menjadi satu elemen:

```html
<section class="scene" data-scene="1.4" data-start="8.84" data-end="14.29">
  <p data-script>Mulai dari Amerika Serikat, Inggris, Jerman, Jepang sampai Australia.</p>
</section>
```

Aturan:
- `data-scene` sama persis dengan nomor scene di storyboard.
- `data-start` dan `data-end` dalam **detik**, sama dengan kolom Timeline storyboard.
- Teks script yang tampil ke penonton diberi atribut `data-script`, dan isinya **sama persis** dengan kolom Script storyboard. Tidak boleh diparafrase.
- Jumlah scene di HTML harus sama dengan jumlah scene di storyboard.

## 4. Kontrak JavaScript
HTML wajib memuat GSAP dari pustaka bersama:
```html
<script src="/library/vendor/gsap.min.js"></script>
```

Dan wajib mengekspos:

```js
window.__duration = 73.3;          // total detik, sama dengan storyboard
window.__seek = (t) => { ... };    // pindahkan semua animasi ke waktu t (detik)
window.__ready = Promise.resolve(); // resolve setelah font dan aset termuat
```

Aturan:
- Dibuat dengan **satu timeline GSAP utama yang paused**. `__seek(t)` memanggil `tl.time(t)`.
- `__seek` harus aman dipanggil berulang dan ke arah mana pun (maju dan mundur).
- Setelah `__seek(t)`, tampilan harus langsung final. Tidak boleh ada animasi yang masih berjalan sendiri.

## 5. Dilarang
- `setTimeout`, `setInterval`, `requestAnimationFrame` untuk animasi.
- Animasi CSS (`@keyframes`, `transition`) yang berjalan sendiri. Semua gerak lewat timeline.
- `Date.now()` dan `performance.now()` untuk logika visual.
- `Math.random()` tanpa seed. Pakai fungsi acak ber-seed.
- Pustaka dan font dari CDN. Font bersama dimuat dari `/library/fonts/` (atau lokal `assets/`), dan GSAP wajib dimuat dari `/library/vendor/gsap.min.js`.
- Elemen `<audio>` dan `<video>` untuk suara. Audio dikelola aplikasi, bukan HTML.
- Gambar dan font base64 (`data:`).
- **Kontrol UI bawaan (tombol play, scrubber, timecode).** HTML tidak boleh menampilkan kontrol sendiri. Aplikasi yang mengendalikan playback. Jika HTML memiliki kontrol bawaan, sembunyikan lewat `?render=1`: deteksi `new URLSearchParams(location.search).get('render') === '1'` dan tambahkan class `hidden` pada elemen kontrol.

## 6. Aset Proyek (Flat / Tanpa Subfolder)
Semua file aset proyek berada langsung di dalam folder `assets/` tanpa subfolder tambahan (`assets/images/`, `assets/audio/`, dll tidak digunakan):
- Gambar: `assets/nama.png`
- Audio Narasi: `assets/narasi.mp3` (atau file audio yang disediakan proyek)
- Video: `assets/nama.mp4`
- Font: Font bersama diambil dari pustaka `/library/fonts/nama.woff2` lewat `@font-face`. Font kustom proyek (jika ada) berada langsung di `assets/nama.woff2`.
- Aset yang disebut storyboard (mis. `assets/4c06c433-33-negara.png`) dipakai langsung dengan nama file yang sama di `assets/`.

## 7. Audio (di luar HTML)
Audio tidak ada di HTML. Aplikasi mengelola tiga track:

| Track | Lokasi File | Keterangan |
|---|---|---|
| Narasi | `projects/:id/assets/narasi.mp3` | Spesifik per proyek (patokan timing utama, berada langsung di `assets/`) |
| Musik (BGM) | `library/vendor/audio/bgm/*.mp3` (atau lokal `assets/musik.mp3`) | Bersama/reusable di vendor, volume rendah & ducking otomatis |
| SFX | `library/vendor/audio/sfx/*.wav` (atau lokal `assets/*.wav`) | Bersama/reusable di vendor, diatur lewat `cues.json`. Referensi nama file lihat [`SFX.md`](./SFX.md) |

> **Pustaka Global vs Lokal**: SFX dan BGM secara bawaan diambil dari pustaka bersama vendor (`library/vendor/audio/`). Proyek hanya menyediakan audio narasi dan aset visual yang unik langsung di folder `assets/`. Referensi daftar nama SFX yang tersedia dan karakternya dapat dilihat di [`SFX.md`](./SFX.md). Namun jika proyek memiliki SFX atau musik kustom sendiri, sistem akan memprioritaskan aset lokal di `projects/:id/assets/`.

### Format `cues.json`
```json
[
  { "scene": "1.6", "offset": 0.2, "file": "whoosh-fast.wav", "volume": 0.8 },
  { "scene": "1.10", "offset": 0, "file": "hit-punchy.wav", "volume": 1.0 }
]
```
- `scene`: nomor scene sesuai storyboard.
- `offset`: detik jeda dari awal scene dimulai.
- `file`: nama file SFX di pustaka bersama `library/vendor/audio/sfx/` (sesuai referensi di [`SFX.md`](./SFX.md)) atau path lokal di `assets/`.
- `volume`: 0 sampai 1.

## 8. Override perbaikan (`fixes.json`)
Perbaikan manual dari aplikasi disimpan terpisah dan tidak mengubah HTML:

```json
[
  { "scene": "1.18", "selector": "[data-script]", "style": { "fontSize": "48px", "top": "1380px" } }
]
```
Karena itu, **selector harus stabil**: pakai `data-scene`, `data-script`, atau `data-role`, bukan class acak.

## 9. Penamaan elemen
- `data-role="title"`, `data-role="caption"`, `data-role="visual"`, `data-role="deco"`
- Ini dipakai pemeriksa dan override untuk menemukan elemen.

## 10. Yang diperiksa aplikasi
- Jumlah dan nomor scene sesuai storyboard
- Teks `data-script` sama dengan script storyboard
- Teks tidak meluber atau keluar canvas dan safe area
- Font dan aset termuat
- Scene tidak kosong dan ada gerakan sesuai storyboard
- Durasi dan timing sesuai `data-start`/`data-end`
- Tidak ada `data:` base64 dan tidak ada URL eksternal

## 11. Checklist sebelum Claude menyerahkan hasil
- [ ] 1080×1920, `#stage`
- [ ] GSAP dimuat dari `/library/vendor/gsap.min.js`
- [ ] Font dimuat dari `/library/fonts/` (atau lokal `assets/`), tanpa font CDN
- [ ] Semua scene punya `data-scene`, `data-start`, `data-end`
- [ ] Semua teks script ada di `data-script` dan persis sama
- [ ] `__duration`, `__seek`, `__ready` tersedia
- [ ] Satu timeline paused, tanpa timer atau CSS animation liar
- [ ] Semua aset proyek berada langsung di folder `assets/` (struktur flat tanpa subfolder), tanpa base64 dan tanpa CDN
- [ ] Audio SFX pada `cues.json` menggunakan referensi dari `SFX.md` (di `library/vendor/audio/sfx/`)
- [ ] Tidak ada `<audio>` di dalam HTML
- [ ] Teks di dalam safe area

## 12. Template prompt untuk Claude
```
Ubah storyboard.md terlampir menjadi index.html motion.
Ikuti SPEC.md secara ketat, terutama:
1. GSAP dimuat dari /library/vendor/gsap.min.js dan font dari /library/fonts/.
2. Kontrak JS (__duration, __seek, __ready) dan scene (data-scene, data-start, data-end, data-script).
3. Struktur aset: semua aset diletakkan langsung di folder assets/ tanpa subfolder (misal assets/gambar.png).
4. Audio SFX di cues.json mengacu pada daftar referensi SFX.md dengan lokasi pustaka library/vendor/audio/sfx/.
Di akhir, tampilkan checklist bagian 11 dan tandai mana yang terpenuhi.
```
