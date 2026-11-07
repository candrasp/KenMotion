# SAFE AREA SPECIFICATION (1080 × 1920)

Pedoman area aman agar teks, subjudul, dan elemen visual penting tidak tertutup oleh UI platform (tombol Like/Komentar, nama akun, caption, search bar).

## 1. Universal Safe Area (Default & Rekomendasi Utama)
Irisan teraman yang menjamin konten tidak tertabrak di TikTok, YouTube Shorts, maupun Instagram Reels:

- **Atas:** 180px
- **Bawah:** 340px
- **Kiri:** 60px
- **Kanan:** 140px (ruang untuk kolom ikon interaksi)
- **Bounding Box Konten:** `left: 60px; top: 180px; width: 880px; height: 1400px;`

---

## 2. Rincian Per Platform

### A. TikTok
- **Atas:** 180px (Search bar, Live, feed tabs)
- **Bawah:** 340px (Username, caption 2-3 baris, audio ticker)
- **Kanan:** 140px (Avatar follow, like, komentar, bookmark, share)
- **Kiri:** 60px

### B. YouTube Shorts
- **Atas:** 140px (Search icon, kamera, menu titik tiga)
- **Bawah:** 300px (Judul, channel name, tombol Subscribe, remix sound)
- **Kanan:** 130px (Like, dislike, komentar, share, remix icon)
- **Kiri:** 60px

### C. Meta (Instagram & Facebook Reels Organik)
- **Atas:** 120px (Header judul Reels)
- **Bawah:** 340px (Username, caption 2 baris, audio ticker)
- **Kanan:** 130px (Like, komentar, share)
- **Kiri:** 50px (Margin tepi layar)

