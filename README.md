# Jarimatika CNN — Klasifikasi Angka Jarimatika 1–9

Website untuk mengklasifikasikan gestur **angka jarimatika 1–9** dari foto tangan menggunakan
**Convolutional Neural Network (CNN) dengan Backpropagation**. Proyek Akhir Jaringan Syaraf Tiruan — Kelompok 5.

- **Tanpa backend.** Seluruh proses (deteksi tangan, preprocessing, dan inferensi CNN) berjalan di browser.
  Foto tidak dikirim ke server mana pun.
- **Pipeline identik dengan notebook Google Colab.** Deteksi tangan MediaPipe → crop persegi (margin 20%) →
  topeng tangan (latar dihitamkan) → resize 64×64 rata-rata kotak → grayscale → ÷255 → CNN.
  Bobot yang dipakai adalah hasil pelatihan notebook (dataset bertopeng, seed 42, akurasi uji 94,44%).
- **Dua cara input:** unggah gambar (klik, seret-lepas, atau tempel Ctrl+V) dan kamera perangkat
  (kamera depan/belakang, timer 3 detik).

## Halaman

| Halaman | Alamat | Isi |
|---|---|---|
| Splash | (saat pertama dibuka) | Memuat bobot model & detektor tangan, dengan progres nyata |
| Beranda | `/#/` | Pengantar, statistik, cara kerja, referensi gestur 1–9, tips foto |
| Tentang | `/#/tentang` | Biodata developer, arsitektur CNN, parameter pelatihan, evaluasi, dataset |
| Klasifikasi | `/#/klasifikasi` | Unggah gambar / kamera, lalu proses klasifikasi |
| Hasil | `/#/hasil` | Angka terdeteksi, tingkat keyakinan, probabilitas 9 kelas, citra masukan 64×64 |

## Deploy ke GitHub + Vercel

1. Ekstrak zip ini, lalu unggah **seluruh isinya** ke repository GitHub baru
   (berkas `index.html` harus berada di root repository).
   - Lewat web GitHub: *Add file → Upload files*, seret semua file & folder, lalu *Commit*.
   - Lewat terminal:
     ```bash
     git init && git add . && git commit -m "Website Jarimatika CNN"
     git branch -M main
     git remote add origin https://github.com/USERNAME/jarimatika-cnn.git
     git push -u origin main
     ```
2. Buka [vercel.com](https://vercel.com) → **Add New… → Project** → pilih repository tersebut.
3. Pengaturan: **Framework Preset = Other**, *Build Command* dan *Output Directory* **dikosongkan**.
   Lalu klik **Deploy**.
4. Selesai. Vercel memberi alamat `https://nama-proyek.vercel.app`, yang sudah HTTPS
   (syarat browser agar kamera bisa dipakai).

Setiap kali Anda melakukan `push` ke GitHub, Vercel otomatis men-deploy ulang.

## Menjalankan di komputer sendiri

Karena memakai ES module, website harus dibuka lewat server lokal (bukan klik dua kali `index.html`):

```bash
python -m http.server 8000
# buka http://localhost:8000
```
Kamera juga berfungsi di `localhost`.

## Mengubah biodata developer

Edit `assets/js/config.js`. Isi kolom `peran`, `prodi`, `instansi`, `email`, `github`, `linkedin`,
`instagram` (kolom kosong otomatis tidak ditampilkan). Untuk foto, simpan file di `assets/img/tim/`
(misalnya `erson.jpg`, persegi, ±400×400 px) lalu isi `foto: './assets/img/tim/erson.jpg'`.

## Mengganti bobot model

Bila Anda melatih ulang model di Colab, unduh `bobot_akhir_cnn.npz`, lalu jalankan:

```bash
python tools/konversi_bobot.py bobot_akhir_cnn.npz --akurasi 0.9444 --presisi 0.9492 --recall 0.9444
```
Angka evaluasi di halaman Tentang & Beranda ikut diperbarui dari `assets/model/model.json`.
Pastikan model dilatih dengan **dataset bertopeng** (`dataset_jarimatika_mask.zip`), karena website
selalu menghitamkan latar sebelum klasifikasi.

## Struktur

```
index.html                  kerangka halaman + splash
vercel.json                 header keamanan & cache untuk Vercel
assets/
  css/style.css             palet warna, tipografi, layout, animasi
  js/app.js                 splash, router, transisi halaman
  js/pages.js               halaman Beranda, Tentang, Hasil
  js/klasifikasi.js         halaman Klasifikasi (unggah & kamera)
  js/preprocess.js          crop, topeng, resize 64×64, grayscale (sama dengan notebook)
  js/model.js               umpan maju CNN (konvolusi, ReLU, max pooling, FC, Softmax)
  js/hand.js                deteksi 21 titik tangan (MediaPipe Hand Landmarker)
  js/config.js              biodata developer (silakan diubah)
  model/bobot.bin, model.json   bobot CNN (131.321 parameter, float32)
  mediapipe/                MediaPipe Tasks Vision + model tangan (di-host sendiri, tanpa CDN)
  fonts/                    Plus Jakarta Sans & JetBrains Mono (di-host sendiri)
  img/gestur/1–9.webp       contoh gestur
tools/konversi_bobot.py     konversi .npz Colab → bobot.bin
```

## Desain

- **Palet:** indigo `#3B3AA8` (jaringan saraf/teknologi), jingga hangat `#F2994A` (jari/tangan, belajar berhitung),
  di atas krem `#FAF7F2`, dengan teks tinta `#1C1A3B`. Proporsi kira-kira 60% krem/putih, 30% indigo, 10% jingga.
  Semua pasangan teks–latar lolos kontras **WCAG AA** (diuji otomatis dengan axe-core).
- **Font:** *Plus Jakarta Sans* untuk UI & judul, *JetBrains Mono* untuk angka & probabilitas.
- **Animasi:** transisi halaman fade-slide 0,4 detik, elemen muncul bertahap saat digulir, batang probabilitas
  beranimasi. Semua animasi otomatis dimatikan bila pengguna mengaktifkan "kurangi animasi" di sistem operasinya.

## Pengujian yang sudah dilakukan

- **Paritas dengan Python** pada seluruh 900 foto dataset: prediksi website sama dengan notebook pada
  877 dari 900 foto (97,4%), dengan median selisih probabilitas 0,0000. Pada 180 data uji notebook,
  akurasi website 93,33% (notebook 94,44%). Selisih kecil ini terjadi karena detektor tangan versi web
  menempatkan titik sendi sedikit berbeda, sehingga kotak crop bergeser median 14 piksel.
- **68 uji E2E otomatis (Playwright + Chrome), semuanya lulus.** Cakupannya:
  - navigasi, tombol back/forward, klik menu bertubi-tubi, dan halaman 404;
  - unggah JPG/PNG/WEBP serta foto dengan rotasi EXIF;
  - file tidak valid: teks, file rusak, file kosong, file lebih dari 25 MB, HEIC, dan gambar terlalu kecil;
  - gambar tanpa tangan, klik ganda, dan pindah halaman saat proses berjalan;
  - refresh di halaman hasil, seret-lepas, tempel dari clipboard, dan navigasi keyboard;
  - kamera: jepret, timer, ambil ulang, kamera mati saat pindah halaman atau saat tab disembunyikan,
    izin ditolak, kamera tidak ditemukan, dan kamera sedang dipakai aplikasi lain;
  - menu seluler;
  - tidak ada scroll horizontal di lebar 320–1920 px;
  - aksesibilitas dan kontras warna (axe-core);
  - mode kurangi animasi, serta kegagalan memuat bobot atau detektor.

## Catatan

- Akurasi 94,44% diukur dengan pembagian acak berstrata 80:20. Pada foto dengan orang, latar,
  atau pencahayaan yang sangat berbeda dari data latih, akurasi bisa lebih rendah.
- Foto HEIC (iPhone) belum didukung browser selain Safari. Ubah ke JPG terlebih dahulu.
- Lisensi pustaka pihak ketiga: lihat `THIRD_PARTY_NOTICES.md`.
