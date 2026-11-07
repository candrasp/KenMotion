# DESIGN: Motion Checker & Renderer

Dark, flat, nyaman di mata. Tanpa glow, tanpa shadow, tanpa gradien. Radius minimal. Fokus pada fungsi.

## 1. Prinsip
- Pisahkan area dengan **tingkat warna dan border 1px**, bukan shadow.
- **Satu warna aksen.** Warna lain hanya untuk status.
- Hindari hitam dan putih murni.
- Animasi hanya fungsional (120 ms untuk hover dan fokus).
- Ringan untuk laptop lemah: tanpa `backdrop-filter`, blur, atau shadow besar.

## 2. Token

### Warna
| Token | Nilai | Pakai untuk |
|---|---|---|
| `--bg` | `#121315` | Latar aplikasi |
| `--panel` | `#1a1b1e` | Panel, timeline |
| `--raised` | `#222428` | Input, hover, item terpilih |
| `--border` | `#2e3036` | Garis pemisah |
| `--border-strong` | `#3a3d44` | Border input saat hover |
| `--text` | `#e3e5e8` | Teks utama |
| `--text-dim` | `#8b8f98` | Teks sekunder, label |
| `--accent` | `#5b8def` | Aksi utama, playhead, fokus |
| `--accent-dim` | `rgba(91,141,239,.35)` | Klip aktif, seleksi |
| `--danger` | `#e5534b` | Error |
| `--warn` | `#d9a441` | Peringatan |
| `--ok` | `#4caf7d` | Lolos |

### Bentuk dan jarak
- Radius: `--radius: 2px` (maksimal 4px). Tombol bulat dan pil tidak dipakai.
- Border: 1px `--border`.
- Jarak: kelipatan 4px (`4, 8, 12, 16, 24`).
- Tinggi kontrol: 28px (kompak) dan 32px (standar).

### Tipografi
- UI: **Inter** (`InterVariable.woff2`), 13px, berat 400 dan 500.
- Timecode dan angka: **JetBrains Mono**, 12px.
- Judul panel: 11px, huruf kapital, `letter-spacing: .06em`, `--text-dim`.
- Font disimpan lokal di `public/fonts`.

### Ikon
- **Lucide** (`lucide-vue-next`), 16px, stroke 1.5, warna mengikuti teks.

## 3. Tata letak

```
┌──────────────────────────────────────────────────┐
│ Top bar: proyek · import · render                │
├─────────┬──────────────────────┬─────────────────┤
│ Scene   │                      │ Inspector | Chat│
│ + Temu- │   Preview 9:16       │ (teks, waktu,   │
│ an      │                      │  override/chat) │
├─────────┴──────────────────────┴─────────────────┤
│ Toolbar timeline: play, waktu, zoom              │
│ Ruler + track: Scene, Narasi, Musik, SFX         │
└──────────────────────────────────────────────────┘
```

- Top bar 40px. Timeline 240px (bisa diubah ukurannya).
- Semua panel bisa diubah ukurannya dengan drag pada garis pemisah.
- Panel kiri (Scene + Temuan) paling penting. Setiap scene menampilkan titik status.
- Panel kanan punya dua tab: **Inspector** dan **Chat**. Lebar bawaan 340px, bisa diubah ukurannya.

## 4. Komponen

**Tombol**
- Utama: latar `--accent`, teks gelap.
- Biasa: latar `--raised`, border `--border`.
- Ikon saja: transparan, hover `--raised`.
- Fokus: outline 1px `--accent`. Disabled: opasitas 40%.

**Input**: latar `--raised`, border `--border`, fokus border `--accent`.

**Item scene**: nomor (mono), cuplikan teks, titik status di kanan. Terpilih: latar `--raised` dan garis 2px `--accent` di kiri.

**Temuan**: ikon status 14px, judul, deskripsi satu baris, tombol "Buka". Warna status hanya pada ikon dan titik, jangan blok besar.

**Toast dan dialog**: latar `--panel`, border `--border`, tanpa shadow.

## 5. Timeline

### Elemen
- **Ruler** di atas: tanda waktu menyesuaikan zoom.
- **Playhead**: garis 1px `--accent` dengan kepala segitiga kecil, tanpa glow.
- **Track:** Scene, Narasi, Musik, SFX. Tinggi 32px, label di kiri (lebar 96px, tetap saat scroll horizontal).
- **Klip:** latar `--accent-dim` dengan border 1px aksen. Track berbeda memakai variasi redup yang sama, bukan warna-warni.
- **Waveform** untuk audio, warna `--text-dim`.
- Klip bertemuan (scene) menampilkan titik status di pojok.

### Zoom
Skala disimpan sebagai `pxPerSecond`.

| Hal | Aturan |
|---|---|
| Rentang | 4 sampai 600 px/detik |
| Default | **Fit**: seluruh durasi pas selebar timeline |
| Zoom masuk/keluar | Faktor 1,25 per langkah |
| Titik tumpu | Zoom berpusat di **playhead** (tombol) atau **kursor** (scroll mouse) |
| Reset | Mengembalikan ke Fit dan menggulung ke awal |
| Level frame | Pada zoom tinggi, tampil garis per frame (30 fps), dan playhead snap ke frame |

**Kontrol** (toolbar timeline, kanan):
- `ZoomOut` (−), slider zoom, `ZoomIn` (+), dan tombol **Reset zoom** (`Maximize2`, tooltip "Sesuaikan ke layar").
- Angka level zoom (mono), mis. `120 px/s`, di sebelah slider.

**Shortcut:**
| Aksi | Tombol |
|---|---|
| Zoom masuk | `Ctrl` + `=` atau `Ctrl` + scroll naik |
| Zoom keluar | `Ctrl` + `-` atau `Ctrl` + scroll turun |
| **Reset zoom (Fit)** | `Ctrl` + `0` atau klik dua kali slider zoom |
| Geser horizontal | `Shift` + scroll, atau drag dengan klik tengah |
| Zoom ke seleksi | `Z` |

**Ruler adaptif:**
- Zoom rendah: tanda tiap 10 detik, label `MM:SS`.
- Zoom sedang: tiap 1 detik.
- Zoom tinggi: tiap frame dan label `SS:FF`.

**Perilaku:**
- Saat playback, timeline mengikuti playhead (tombol `Follow` bisa dimatikan).
- Zoom tidak boleh membuat konten keluar dari batas (clamp).
- Posisi dan level zoom diingat per proyek.
- Render timeline lewat **canvas** atau elemen virtualized, agar tetap ringan di zoom tinggi.

## 6. Panel chat

Panel kanan, tab **Chat**. Gayanya mengikuti plugin Claude di VS Code: padat, rapi, dan fokus pada isi.

```
┌───────────────────────────┐
│ Chat   [Sesi baru][Undo]  │  header 36px
├───────────────────────────┤
│ Anda                      │
│ ┌───────────────────────┐ │
│ │ Perbaiki teks meluber │ │  pesan pengguna: latar --raised
│ └───────────────────────┘ │
│ Claude                    │
│ Saya perkecil font...     │  pesan Claude: tanpa latar
│ ✎ Mengedit index.html     │  baris aktivitas (mono, redup)
├───────────────────────────┤
│ [Scene 1.18] [2 temuan] ✕ │  chip konteks
│ ┌───────────────────┬───┐ │
│ │ Tulis pesan...    │ ↑ │ │  input + kirim
│ └───────────────────┴───┘ │
└───────────────────────────┘
```

**Pesan**
- Pengguna: latar `--raised`, border `--border`, radius 2px, rata penuh lebar panel (bukan balon).
- Claude: tanpa latar, teks `--text`, label kecil "Claude" `--text-dim`.
- Pesan Claude ditampilkan mengalir (streaming), dengan markdown sederhana. Blok kode memakai JetBrains Mono di latar `--bg`.

**Baris aktivitas** (pemakaian alat)
- Satu baris per aksi: ikon 14px + teks mono 12px `--text-dim`, mis. `Membaca SPEC.md`, `Mengedit index.html`.
- Sedang berjalan: spinner kecil. Selesai: `Check` warna `--ok`. Gagal: `X` warna `--danger`.
- Aktivitas beruntun dilipat menjadi satu grup ("5 aksi") yang bisa dibuka.

**Chip konteks** (di atas input)
- Menampilkan konteks yang akan dikirim: scene terpilih, jumlah temuan, screenshot.
- Bisa dihapus dengan tombol `X`. Latar `--raised`, teks 12px.

**Input**
- Textarea tumbuh otomatis (maksimal 6 baris). `Enter` kirim, `Shift` + `Enter` baris baru.
- Tombol kirim (`ArrowUp`) berubah menjadi tombol **Stop** (`Square`) saat Claude bekerja.

**Header**
- `Plus` untuk sesi baru, `Undo2` untuk **Batalkan perubahan terakhir** (tooltip menyebut giliran yang dibatalkan).

**Kondisi kosong**
- Satu kalimat singkat dan 2 sampai 3 chip saran, mis. "Perbaiki temuan di scene ini", "Cek teks yang meluber". Chip itu mengirim pesan dengan satu klik.

**Saat Claude bekerja**
- Banner tipis 24px di atas panel Inspector: "Claude sedang mengedit. Edit manual dikunci." Latar `--raised`, ikon `Lock`.
- Setelah selesai, preview dimuat ulang dan pemeriksa dijalankan ulang. Tampilkan ringkasan kecil: "Temuan: 5 → 2".

**Error**
- CLI tidak ditemukan, belum login, atau proses mati: pesan ramah dengan satu tombol aksi ("Coba lagi"). Tanpa tumpukan teks teknis (sediakan "Lihat detail").

**Ikon:** `MessageSquare` (tab), `ArrowUp`, `Square`, `Plus`, `Undo2`, `Lock`, `FileEdit`, `FileText`, `Check`, `X`.

## 7. Status dan umpan balik
- Memuat: spinner kecil 14px, tanpa skeleton berat.
- Kosong: ikon redup + satu kalimat + satu tombol aksi.
- Error: pesan ramah, apa yang terjadi dan apa yang bisa dilakukan.
- Render: progress bar tipis 2px di bawah top bar, dan angka persen.

## 8. Aksesibilitas
- Kontras teks minimal 4,5:1 terhadap latar.
- Semua aksi punya fokus keyboard yang terlihat.
- Tooltip pada setiap tombol ikon, memuat nama dan shortcut.
- Status tidak hanya dengan warna: selalu disertai ikon.

## 9. Aturan kode
- Token warna dan jarak ada di satu file CSS variabel (`tokens.css`).
- Jangan menaruh semua CSS atau TS dalam satu file. Pecah per komponen dan tanggung jawab.
- Tidak ada warna hex langsung di komponen. Pakai token.
- Ikon diimpor satu per satu dari Lucide (tree-shaking).

## 10. Yang dihindari
Glow, shadow besar, gradien, blur, radius besar, tombol pil, warna jenuh, animasi dekoratif, dan emoji di UI.
