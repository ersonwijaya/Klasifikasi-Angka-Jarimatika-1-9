import { IKON } from './icons.js';
import { state, simpanHasil, dengarDetektor } from './state.js';
import { siapkanDetektor } from './hand.js';
import { muatModel, prediksi } from './model.js';
import { keKanvas, praproses, inputKeDataURL, pratinjauDenganKotak, GalatPraproses } from './preprocess.js';
import { aturStatusDetektor } from './state.js';

const MAKS_UKURAN = 25 * 1024 * 1024;   // 25 MB
const TIPE_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

export function halamanKlasifikasi(el, { navigasi, toast }) {
  let aktif = true;               // false setelah meninggalkan halaman
  let sibuk = false;              // sedang memproses klasifikasi
  let terpilih = null;            // { kanvas, url, nama, sumber }
  let stream = null;
  let arahKamera = 'environment';
  let hitungMundur = null;
  let tokenKamera = 0;

  el.innerHTML = `
  <section class="page-head">
    <div class="container">
      <span class="eyebrow"><i></i>Klasifikasi</span>
      <h1>Tunjukkan angka dengan jari Anda</h1>
      <p>Pilih cara memasukkan gambar: unggah foto dari perangkat atau ambil langsung dengan kamera. Gunakan tangan kanan seperti contoh gestur.</p>
    </div>
  </section>
  <section class="container klas-grid">
    <div class="card panel">
      <div class="segmen" role="tablist" aria-label="Sumber gambar" data-mode="unggah">
        <span class="penanda" aria-hidden="true"></span>
        <button role="tab" id="tab-unggah" aria-controls="panel-unggah" aria-selected="true" data-tab="unggah">${IKON.unggah} Unggah<span class="lebar">&nbsp;gambar</span></button>
        <button role="tab" id="tab-kamera" aria-controls="panel-kamera" aria-selected="false" data-tab="kamera" tabindex="-1">${IKON.kamera} Kamera</button>
      </div>

      <div class="tab-panel" id="panel-unggah" role="tabpanel" aria-labelledby="tab-unggah">
        <div class="dropzone" id="dropzone" role="button" tabindex="0">
          <div>
            <div class="ikon-besar" style="margin-inline:auto">${IKON.gambar}</div>
            <h3 id="dz-judul">Seret &amp; lepas foto di sini</h3>
            <p id="dz-info">atau <b style="color:var(--primary)">klik untuk memilih file</b> · bisa juga tempel (Ctrl+V)</p>
            <small>JPG, PNG, atau WEBP · maksimal 25 MB</small>
          </div>
        </div>
        <input type="file" id="input-file" accept="image/jpeg,image/png,image/webp,image/bmp,image/gif" hidden />
        <div id="unggah-terpilih" hidden>
          <div class="pratinjau"><img id="img-pratinjau" alt="Pratinjau gambar yang dipilih" /><span class="label-file" id="label-file"></span></div>
          <div class="aksi-baris">
            <button class="btn btn-primary btn-lg" id="btn-klas-unggah">${IKON.otak} Klasifikasikan</button>
            <button class="btn btn-ghost btn-lg" id="btn-ganti">${IKON.ulang} Ganti gambar</button>
          </div>
        </div>
      </div>

      <div class="tab-panel" id="panel-kamera" role="tabpanel" aria-labelledby="tab-kamera" hidden>
        <div class="pratinjau" id="layar-kamera">
          <div class="kamera-kosong" id="kamera-kosong">
            <div class="ikon-besar">${IKON.kamera}</div>
            <h3>Kamera belum aktif</h3>
            <p>Izinkan akses kamera saat diminta browser. Gambar hanya diproses di perangkat Anda.</p>
            <button class="btn btn-accent" id="btn-aktifkan" style="margin-top:8px">${IKON.kamera} Aktifkan kamera</button>
          </div>
          <video id="video" playsinline muted hidden></video>
          <img id="img-jepret" alt="Hasil jepretan kamera" hidden />
          <div class="panduan-bingkai" id="panduan" hidden></div>
          <div class="hitung-mundur" id="hitung" hidden></div>
          <div class="kilat" id="kilat"></div>
        </div>
        <div id="kontrol-langsung" hidden>
          <div class="kamera-kontrol">
            <label class="toggle"><input type="checkbox" id="cek-timer" /> Timer 3 dtk</label>
            <button class="rana" id="btn-jepret" aria-label="Ambil gambar" disabled></button>
            <button class="btn btn-ghost btn-icon" id="btn-putar" aria-label="Ganti kamera depan/belakang" hidden>${IKON.putar}</button>
          </div>
        </div>
        <div id="kontrol-jepret" hidden>
          <div class="aksi-baris">
            <button class="btn btn-primary btn-lg" id="btn-klas-kamera">${IKON.otak} Klasifikasikan</button>
            <button class="btn btn-ghost btn-lg" id="btn-ulang">${IKON.kamera} Ambil ulang</button>
          </div>
        </div>
      </div>
      <div id="pesan" aria-live="polite"></div>
    </div>

    <aside class="card panel sisi">
      <div class="status-detektor" id="status-detektor"><span class="bulat"></span><span id="teks-detektor">Menyiapkan detektor tangan…</span></div>
      <h3>Agar hasil akurat</h3>
      <ul class="cek">
        <li>${IKON.cek}<span>Gunakan <b>tangan kanan</b> dengan gestur seperti contoh.</span></li>
        <li>${IKON.cek}<span>Seluruh jari &amp; pergelangan masuk ke dalam foto.</span></li>
        <li>${IKON.cek}<span>Cahaya cukup, tangan tidak buram.</span></li>
        <li class="tidak">${IKON.silang}<span>Hindari beberapa tangan sekaligus atau jari terpotong frame.</span></li>
      </ul>
      <div class="mini-gestur" aria-hidden="true">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<img src="./assets/img/gestur/${n}.webp" alt="" loading="lazy" />`).join('')}</div>
      <p class="muted" style="font-size:.85rem;margin:8px 0 0">Contoh gestur angka 1 sampai 9 (kiri ke kanan).</p>
    </aside>
  </section>`;

  const $ = (id) => el.querySelector('#' + id);
  const segmen = el.querySelector('.segmen');
  const tabs = el.querySelectorAll('[data-tab]');
  const pesan = $('pesan');

  // ---------- status detektor ----------
  const kotakStatus = $('status-detektor'), teksStatus = $('teks-detektor');
  const tampilStatus = (s) => {
    kotakStatus.className = 'status-detektor' + (s === 'siap' ? ' siap' : s === 'gagal' ? ' gagal' : '');
    teksStatus.innerHTML = s === 'siap' ? 'Detektor tangan &amp; model CNN siap'
      : s === 'gagal' ? 'Detektor gagal dimuat. <a href="javascript:location.reload()">Muat ulang</a>'
        : 'Menyiapkan detektor tangan…';
  };
  tampilStatus(state.detektor);
  const lepasDengar = dengarDetektor(tampilStatus);

  // ---------- pesan / alert ----------
  function tampilPesan(jenis, judul, isi, daftar = []) {
    const ik = jenis === 'error' ? IKON.awas : jenis === 'warn' ? IKON.awas : IKON.info;
    pesan.innerHTML = `<div class="alert alert-${jenis}" role="${jenis === 'error' ? 'alert' : 'status'}">${ik}<div><b>${judul}</b><p>${isi}</p>${daftar.length ? `<ul>${daftar.map((d) => `<li>${d}</li>`).join('')}</ul>` : ''}</div></div>`;
  }
  const hapusPesan = () => { pesan.innerHTML = ''; };

  // ---------- tab ----------
  function pilihTab(mode, fokus = false) {
    if (sibuk) return;
    state.mode = mode;
    segmen.dataset.mode = mode;
    tabs.forEach((t) => {
      const ya = t.dataset.tab === mode;
      t.setAttribute('aria-selected', String(ya));
      t.tabIndex = ya ? 0 : -1;
      if (ya && fokus) t.focus();
    });
    $('panel-unggah').hidden = mode !== 'unggah';
    $('panel-kamera').hidden = mode !== 'kamera';
    hapusPesan();
    if (mode !== 'kamera') matikanKamera();
  }
  tabs.forEach((t) => t.addEventListener('click', () => pilihTab(t.dataset.tab)));
  segmen.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); pilihTab(state.mode === 'unggah' ? 'kamera' : 'unggah', true); }
  });

  // ================= UNGGAH =================
  const dz = $('dropzone'), input = $('input-file');
  dz.addEventListener('click', () => { if (!sibuk) input.click(); });
  dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!sibuk) input.click(); } });
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('seret'); }));
  ['dragleave', 'dragend'].forEach((ev) => dz.addEventListener(ev, (e) => { if (!dz.contains(e.relatedTarget)) dz.classList.remove('seret'); }));
  dz.addEventListener('drop', (e) => {
    e.preventDefault(); dz.classList.remove('seret');
    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) { tampilPesan('error', 'Tidak ada file', 'Seret file gambar dari perangkat Anda.'); return; }
    if (files.length > 1) toast('Hanya satu gambar yang diproses — file pertama dipakai.');
    terimaFile(files[0]);
  });
  input.addEventListener('change', () => { const f = input.files && input.files[0]; input.value = ''; if (f) terimaFile(f); });
  const onPaste = (e) => {
    if (state.mode !== 'unggah' || sibuk) return;
    const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === 'file' && i.type.startsWith('image/'));
    if (item) { e.preventDefault(); terimaFile(item.getAsFile(), 'gambar-tempel.png'); }
  };
  document.addEventListener('paste', onPaste);

  let tokenFile = 0;
  async function terimaFile(file, namaAlt) {
    if (sibuk || !file) return;
    hapusPesan();
    const nama = file.name || namaAlt || 'gambar';
    const ext = (nama.split('.').pop() || '').toLowerCase();
    if (/^(heic|heif)$/.test(ext) || /hei[cf]/.test(file.type)) {
      tampilPesan('error', 'Format HEIC belum didukung', 'Ubah foto ke JPG terlebih dahulu (misalnya lewat aplikasi Foto, atau atur kamera iPhone ke “Most Compatible”).');
      return;
    }
    if (!(TIPE_OK.includes(file.type) || (!file.type && /^(jpe?g|png|webp|bmp|gif)$/.test(ext)))) {
      tampilPesan('error', 'File bukan gambar yang didukung', `“${esc(nama)}” tidak dapat diproses. Gunakan file JPG, PNG, atau WEBP.`);
      return;
    }
    if (file.size === 0) { tampilPesan('error', 'File kosong', 'File yang dipilih tidak berisi data.'); return; }
    if (file.size > MAKS_UKURAN) { tampilPesan('error', 'File terlalu besar', `Ukuran maksimal 25 MB (file ini ${(file.size / 1048576).toFixed(1)} MB).`); return; }
    const token = ++tokenFile;
    let kanvas;
    try { kanvas = await keKanvas(file); } catch (e) {
      if (token !== tokenFile || !aktif) return;
      tampilPesan('error', e.kode === 'kecil' ? 'Gambar terlalu kecil' : 'Gambar tidak dapat dibaca', e.message || 'File rusak atau formatnya tidak dikenali.');
      return;
    }
    if (token !== tokenFile || !aktif) return;
    gantiTerpilih({ kanvas, url: URL.createObjectURL(file), nama, sumber: 'unggah' });
    $('img-pratinjau').src = terpilih.url;
    $('label-file').textContent = `${nama} · ${kanvas.width}×${kanvas.height}`;
    dz.hidden = true;
    $('unggah-terpilih').hidden = false;
    $('btn-klas-unggah').focus({ preventScroll: true });
  }
  function gantiTerpilih(baru) {
    if (terpilih && terpilih.url) URL.revokeObjectURL(terpilih.url);
    terpilih = baru;
  }
  $('btn-ganti').addEventListener('click', () => {
    if (sibuk) return;
    gantiTerpilih(null);
    $('unggah-terpilih').hidden = true; dz.hidden = false; hapusPesan();
    input.click();
  });
  $('btn-klas-unggah').addEventListener('click', () => { if (terpilih) klasifikasikan(terpilih); });

  // ================= KAMERA =================
  const video = $('video');
  const kontrolLangsung = $('kontrol-langsung'), kontrolJepret = $('kontrol-jepret');
  let jepretan = null;

  async function nyalakanKamera() {
    hapusPesan();
    if (!window.isSecureContext) {
      tampilPesan('error', 'Kamera membutuhkan koneksi aman', 'Buka website melalui HTTPS (misalnya alamat Vercel) agar browser mengizinkan kamera.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      tampilPesan('error', 'Kamera tidak didukung', 'Browser ini tidak mendukung akses kamera. Gunakan Chrome, Edge, Firefox, atau Safari versi terbaru, atau pilih tab “Unggah gambar”.');
      return;
    }
    const token = ++tokenKamera;
    const btn = $('btn-aktifkan');
    btn.disabled = true; btn.innerHTML = 'Menghubungkan…';
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: arahKamera }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (token !== tokenKamera || !aktif || state.mode !== 'kamera') { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s;
      video.srcObject = s;
      await video.play().catch(() => {});
      const set = s.getVideoTracks()[0]?.getSettings?.() || {};
      const depan = (set.facingMode || arahKamera) === 'user';
      video.classList.toggle('cermin', depan);
      $('kamera-kosong').hidden = true; video.hidden = false; $('panduan').hidden = false; $('img-jepret').hidden = true;
      kontrolLangsung.hidden = false; kontrolJepret.hidden = true;
      const siapJepret = () => { $('btn-jepret').disabled = !(video.videoWidth > 0); };
      if (video.readyState >= 2) siapJepret(); else video.addEventListener('loadeddata', siapJepret, { once: true });
      try {
        const perangkat = await navigator.mediaDevices.enumerateDevices();
        $('btn-putar').hidden = perangkat.filter((d) => d.kind === 'videoinput').length < 2;
      } catch { $('btn-putar').hidden = true; }
    } catch (e) {
      if (token !== tokenKamera || !aktif) return;
      const n = e && e.name;
      const map = {
        NotAllowedError: ['Akses kamera ditolak', 'Izinkan kamera melalui ikon gembok/kamera di bilah alamat browser, lalu tekan “Aktifkan kamera” lagi.'],
        SecurityError: ['Akses kamera ditolak', 'Browser memblokir kamera pada halaman ini.'],
        NotFoundError: ['Kamera tidak ditemukan', 'Perangkat ini tidak memiliki kamera yang bisa dipakai. Gunakan tab “Unggah gambar”.'],
        OverconstrainedError: ['Kamera tidak ditemukan', 'Kamera yang diminta tidak tersedia di perangkat ini.'],
        NotReadableError: ['Kamera sedang dipakai', 'Tutup aplikasi atau tab lain yang sedang memakai kamera, lalu coba lagi.'],
        AbortError: ['Kamera gagal dimulai', 'Coba tekan “Aktifkan kamera” sekali lagi.'],
      };
      const [j, t] = map[n] || ['Kamera gagal dimulai', 'Terjadi kendala saat membuka kamera. Coba lagi atau gunakan tab “Unggah gambar”.'];
      tampilPesan('error', j, t);
    } finally {
      if (btn.isConnected) { btn.disabled = false; btn.innerHTML = `${IKON.kamera} Aktifkan kamera`; }
    }
  }

  function matikanKamera(tampilkanKosong = true) {
    tokenKamera++;
    batalHitung();
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (video) { video.srcObject = null; }
    if (!el.isConnected) return;
    if (tampilkanKosong) {
      video.hidden = true; $('panduan').hidden = true;
      kontrolLangsung.hidden = true; $('btn-jepret').disabled = true;
      if (!jepretan) { $('kamera-kosong').hidden = false; $('img-jepret').hidden = true; kontrolJepret.hidden = true; }
    }
  }

  function batalHitung() {
    if (hitungMundur) { clearInterval(hitungMundur); hitungMundur = null; }
    const h = el.querySelector('#hitung'); if (h) h.hidden = true;
    const b = el.querySelector('#btn-jepret'); if (b && stream) b.disabled = false;
  }

  function ambilFrame() {
    if (!stream || !video.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);   // frame asli (tidak dicerminkan)
    const k = $('kilat'); k.classList.remove('aktif'); void k.offsetWidth; k.classList.add('aktif');
    jepretan = { kanvas: c, url: c.toDataURL('image/jpeg', 0.9), nama: '', sumber: 'kamera' };
    $('btn-jepret').disabled = true;
    $('img-jepret').src = jepretan.url; $('img-jepret').hidden = false;
    matikanKamera(false);
    video.hidden = true; $('panduan').hidden = true; kontrolLangsung.hidden = true; kontrolJepret.hidden = false;
    $('btn-klas-kamera').focus({ preventScroll: true });
  }

  $('btn-aktifkan').addEventListener('click', nyalakanKamera);
  $('btn-jepret').addEventListener('click', () => {
    if (!stream || hitungMundur || sibuk) return;
    if (!$('cek-timer').checked) { ambilFrame(); return; }
    let n = 3; const h = $('hitung'); h.textContent = n; h.hidden = false; $('btn-jepret').disabled = true;
    hitungMundur = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(hitungMundur); hitungMundur = null; h.hidden = true; ambilFrame(); }
      else h.textContent = n;
    }, 1000);
  });
  $('btn-putar').addEventListener('click', async () => {
    if (sibuk) return;
    arahKamera = arahKamera === 'environment' ? 'user' : 'environment';
    matikanKamera(false);
    await nyalakanKamera();
  });
  $('btn-ulang').addEventListener('click', () => {
    if (sibuk) return;
    jepretan = null; $('img-jepret').hidden = true; kontrolJepret.hidden = true; hapusPesan();
    nyalakanKamera();
  });
  $('btn-klas-kamera').addEventListener('click', () => { if (jepretan) klasifikasikan(jepretan); });

  // jeda kamera saat tab browser disembunyikan
  const onVis = () => {
    if (document.hidden && stream) {
      matikanKamera();
      tampilPesan('info', 'Kamera dijeda', 'Kamera dimatikan saat tab tidak aktif. Tekan “Aktifkan kamera” untuk melanjutkan.');
    }
  };
  document.addEventListener('visibilitychange', onVis);

  // ================= PROSES KLASIFIKASI =================
  async function klasifikasikan(sumber) {
    if (sibuk) return;
    sibuk = true; hapusPesan();
    el.querySelectorAll('button').forEach((b) => { b.dataset.wasDisabled = b.disabled ? '1' : ''; b.disabled = true; });
    const overlay = document.createElement('div');
    overlay.className = 'proses';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'Sedang memproses');
    overlay.innerHTML = `<div class="proses-kartu"><h3>Menganalisis gambar…</h3><ol class="proses-langkah">
      <li data-l="0"><span class="ind"></span><span>${state.detektor === 'siap' ? 'Mendeteksi tangan' : 'Menyiapkan detektor tangan'}</span></li>
      <li data-l="1"><span class="ind"></span><span>Crop &amp; menghapus latar</span></li>
      <li data-l="2"><span class="ind"></span><span>Resize 64 × 64 &amp; grayscale</span></li>
      <li data-l="3"><span class="ind"></span><span>Inferensi CNN &amp; Softmax</span></li></ol></div>`;
    document.body.appendChild(overlay);
    const langkah = (i, s) => { const li = overlay.querySelector(`[data-l="${i}"]`); if (li) li.className = s; };
    const t0 = performance.now();
    try {
      langkah(0, 'jalan');
      await muatModel();
      if (state.detektor !== 'siap') {
        await siapkanDetektor().then(() => aturStatusDetektor('siap'));
        overlay.querySelector('[data-l="0"] span:last-child').textContent = 'Mendeteksi tangan';
      }
      await tunggu(30);   // beri kesempatan UI menggambar
      const pp = await praproses(sumber.kanvas);
      langkah(0, 'beres'); langkah(1, 'jalan'); await tunggu(140);
      langkah(1, 'beres'); langkah(2, 'jalan'); await tunggu(140);
      langkah(2, 'beres'); langkah(3, 'jalan');
      const t1 = performance.now();
      const prob = prediksi(pp.I);
      const tInf = performance.now() - t1;
      const hasil = {
        prob,
        angka: prob.indexOf(Math.max(...prob)) + 1,
        pratinjau: pratinjauDenganKotak(sumber.kanvas, pp.kotak, pp.titik),
        input: inputKeDataURL(pp.I),
        waktu: { deteksi: Math.round(pp.waktu.deteksi), praproses: Math.round(pp.waktu.praproses), inferensi: tInf },
        jumlahTangan: pp.jumlahTangan,
        ukuran: [sumber.kanvas.width, sumber.kanvas.height],
        sumber: sumber.sumber,
        namaFile: sumber.nama || '',
        dibuat: Date.now(),
      };
      await tunggu(Math.max(0, 650 - (performance.now() - t0)));
      langkah(3, 'beres'); await tunggu(160);
      if (!aktif) return;
      simpanHasil(hasil);
      overlay.remove();
      sibuk = false;
      navigasi('/hasil');
    } catch (e) {
      if (!(e instanceof GalatPraproses)) console.error(e);   // galat yang sudah ditangani tidak dicatat sebagai error
      overlay.remove();
      if (!aktif) return;
      if (e instanceof GalatPraproses && e.kode === 'tidak-terdeteksi') {
        tampilPesan('error', 'Tangan tidak terdeteksi', 'Model tidak menemukan tangan pada gambar ini. Coba gambar lain dengan memperhatikan:', [
          'seluruh tangan terlihat jelas dan tidak terpotong tepi foto,',
          'cahaya cukup terang dan tangan tidak buram,',
          'tangan tidak terlalu kecil di dalam foto.',
        ]);
      } else if (e instanceof GalatPraproses) {
        tampilPesan('error', 'Gambar tidak dapat diproses', e.message);
      } else if (state.detektor !== 'siap') {
        aturStatusDetektor('gagal');
        tampilPesan('error', 'Detektor tangan gagal dimuat', 'Terjadi kesalahan saat memuat detektor tangan. Periksa koneksi internet, lalu muat ulang halaman.');
      } else {
        tampilPesan('error', 'Terjadi kesalahan', 'Proses klasifikasi gagal. Muat ulang halaman lalu coba lagi.');
      }
    } finally {
      if (aktif && sibuk) {
        sibuk = false;
        el.querySelectorAll('button').forEach((b) => { b.disabled = b.dataset.wasDisabled === '1'; });
        if (stream) $('btn-jepret').disabled = false;
      }
    }
  }

  pilihTab(state.mode === 'kamera' ? 'kamera' : 'unggah');

  // cleanup saat meninggalkan halaman
  return () => {
    aktif = false;
    matikanKamera(false);
    lepasDengar();
    document.removeEventListener('paste', onPaste);
    document.removeEventListener('visibilitychange', onVis);
    gantiTerpilih(null);
    document.querySelectorAll('.proses').forEach((o) => o.remove());
    state.mode = 'unggah';
  };
}
