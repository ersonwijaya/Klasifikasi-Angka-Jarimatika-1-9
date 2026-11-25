import { IKON } from './icons.js';
import { DEVELOPER, PROYEK } from './config.js';
import { infoModel } from './model.js';
import { ambilHasil, state } from './state.js';

const ID = (n, d = 0) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const persen = (p, d = 2) => `${ID(p * 100, d)}%`;
// format probabilitas yang konsisten: 2 desimal, tidak pernah membulat ke 100% atau 0% bila bukan nilai pasti
const prob = (p) => {
  const v = p * 100;
  if (v > 0 && v < 0.005) return '<0,01%';
  if (v < 100 && v >= 99.995) return '>99,99%';
  return `${ID(v, 2)}%`;
};
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GESTUR = ['Telunjuk', 'Telunjuk + tengah', 'Tiga jari', 'Empat jari', 'Ibu jari', 'Ibu jari + telunjuk', 'Ibu jari + dua jari', 'Ibu jari + tiga jari', 'Kelima jari'];

function evaluasi() {
  const m = infoModel();
  return m ? m.evaluasi : { akurasi_uji: 0.9444, presisi_makro: 0.9492, recall_makro: 0.9444, jumlah_uji: 180, jumlah_latih: 720 };
}
function totalParam() { const m = infoModel(); return m ? m.total_parameter : 131321; }

// ============================== BERANDA ==============================
export function halamanBeranda(el) {
  const ev = evaluasi();
  el.innerHTML = `
  <section class="hero">
    <div class="container hero-grid">
      <div>
        <span class="eyebrow"><i></i>${esc(PROYEK.mataKuliah)} · ${esc(PROYEK.kelompok)}</span>
        <h1>Kenali angka <span class="sorot">jarimatika 1–9</span> dari foto tangan.</h1>
        <p class="hero-lead">Unggah foto atau gunakan kamera, lalu <i>Convolutional Neural Network</i> yang dilatih dengan <i>backpropagation</i> akan menebak angka yang Anda tunjukkan dengan jari, lengkap dengan probabilitas setiap kelas.</p>
        <div class="hero-cta">
          <a href="#/klasifikasi" class="btn btn-primary btn-lg">Mulai klasifikasi ${IKON.panah}</a>
          <a href="#cara-kerja" class="btn btn-ghost btn-lg" data-gulir="cara-kerja">Lihat cara kerja</a>
        </div>
        <p class="hero-note">${IKON.perisai} Foto diproses di perangkat Anda — tidak ada yang diunggah ke server.</p>
      </div>
      <div class="hero-visual">
        <div class="grid-gestur">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => `
            <figure class="muncul" style="--d:${0.05 * i}s"><img src="./assets/img/gestur/${n}.webp" alt="Gestur jarimatika angka ${n}" width="180" height="180" loading="eager" /><figcaption>${n}</figcaption></figure>`).join('')}
        </div>
        <div class="chip-float chip-a"><span class="titik"></span>Contoh: angka <b>7</b> · <b>99,5%</b></div>
        <div class="chip-float chip-b">${IKON.otak.replace('<svg', '<svg width="18" height="18" style="color:var(--primary)"')}<span><b>${ID(totalParam())}</b> parameter</span></div>
      </div>
    </div>
  </section>

  <section class="section-tight">
    <div class="container">
      <div class="stats muncul">
        <div class="stat"><b>900</b><span>citra gestur latih &amp; uji</span></div>
        <div class="stat"><b>9</b><span>kelas angka (1–9)</span></div>
        <div class="stat"><b>64×64</b><span>citra masukan grayscale</span></div>
        <div class="stat"><b>${persen(ev.akurasi_uji)}</b><span>akurasi pada ${ev.jumlah_uji} data uji</span></div>
      </div>
    </div>
  </section>

  <section class="section" id="cara-kerja">
    <div class="container">
      <div class="section-head muncul">
        <span class="eyebrow"><i></i>Cara kerja</span>
        <h2>Dari foto tangan ke angka dalam empat langkah</h2>
        <p>Setiap foto diproses dengan langkah yang sama persis seperti saat model dilatih, sehingga hasil di website konsisten dengan hasil penelitian.</p>
      </div>
      <div class="langkah">
        ${[
          [IKON.tangan, 'Deteksi tangan', '21 titik sendi tangan dicari otomatis untuk menemukan posisi tangan di foto.'],
          [IKON.crop, 'Crop & hapus latar', 'Area tangan dipotong persegi (margin 20%), lalu latar di luar tangan dihitamkan.'],
          [IKON.grid, 'Resize 64 × 64', 'Citra diperkecil dengan rata-rata kotak, diubah ke grayscale, dan dinormalisasi ke 0–1.'],
          [IKON.otak, 'CNN + Softmax', '8 kernel konvolusi, max pooling, 16 neuron tersembunyi, lalu Softmax 9 kelas.'],
        ].map(([ik, j, t], i) => `
          <div class="card langkah-item muncul" style="--d:${i * 0.08}s"><div class="ikon">${ik}</div><h3>${j}</h3><p>${t}</p></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="container">
      <div class="section-head muncul">
        <span class="eyebrow"><i></i>Referensi gestur</span>
        <h2>Sembilan gestur jarimatika</h2>
        <p>Gunakan tangan kanan dengan bentuk jari seperti contoh berikut agar hasil klasifikasi paling akurat.</p>
      </div>
      <div class="galeri">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => `
          <figure class="muncul" style="--d:${i * 0.04}s">
            <div class="bingkai"><img src="./assets/img/gestur/${n}.webp" alt="Gestur angka ${n}: ${GESTUR[n - 1]}" loading="lazy" width="180" height="180" /></div>
            <figcaption>Angka ${n}<small>${GESTUR[n - 1]}</small></figcaption>
          </figure>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="container">
      <div class="section-head muncul">
        <span class="eyebrow"><i></i>Tips foto</span>
        <h2>Agar tebakan model tepat</h2>
      </div>
      <div class="tips">
        ${[
          [IKON.tangan, 'Tangan terlihat utuh', 'Pastikan semua ujung jari dan pergelangan masuk ke dalam frame.'],
          [IKON.matahari, 'Cahaya cukup', 'Hindari foto yang terlalu gelap atau tangan yang tertutup bayangan.'],
          [IKON.kamera, 'Posisi seperti contoh', 'Hadapkan tangan kanan ke kamera dengan posisi jari seperti contoh gestur di atas.'],
        ].map(([ik, j, t], i) => `<div class="card tip muncul" style="--d:${i * 0.08}s"><div class="ikon">${ik}</div><div><h3>${j}</h3><p>${t}</p></div></div>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    <div class="container">
      <div class="cta-band muncul">
        <div><h2>Siap mencoba?</h2><p>Tunjukkan angka 1 sampai 9 dengan jari Anda, lalu lihat seberapa yakin model menebaknya.</p></div>
        <a href="#/klasifikasi" class="btn btn-accent btn-lg">Mulai klasifikasi ${IKON.panah}</a>
      </div>
    </div>
  </section>`;

  const gulir = (e) => {
    const a = e.target.closest('[data-gulir]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.gulir)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  el.addEventListener('click', gulir);
  return () => el.removeEventListener('click', gulir);
}

// ============================== TENTANG ==============================
function kartuDev(d, i) {
  const inisial = d.nama.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  const baris = [['NIM', d.nim, true], ['Program studi', d.prodi], ['Instansi', d.instansi], ['Kelompok', PROYEK.kelompok]]
    .filter(([, v]) => v).map(([k, v, m]) => `<dt>${k}</dt><dd${m ? ' class="mono"' : ''}>${esc(v)}</dd>`).join('');
  const sos = [['Email', d.email && `mailto:${d.email}`], ['GitHub', d.github], ['LinkedIn', d.linkedin], ['Instagram', d.instagram]]
    .filter(([, v]) => v).map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener">${k}</a>`).join('');
  return `
  <article class="card dev muncul" style="--d:${i * 0.1}s">
    <div class="avatar">${d.foto ? `<img src="${esc(d.foto)}" alt="Foto ${esc(d.nama)}" />` : esc(inisial)}</div>
    <div>
      <h3>${esc(d.nama)}</h3>
      <p class="peran">${esc(d.peran || 'Developer')}</p>
      <dl>${baris}</dl>
      ${sos ? `<div class="sosial">${sos}</div>` : ''}
    </div>
  </article>`;
}

export function halamanTentang(el) {
  const ev = evaluasi();
  el.innerHTML = `
  <section class="page-head">
    <div class="container">
      <span class="eyebrow"><i></i>Tentang</span>
      <h1>Tim &amp; proyek</h1>
      <p>${esc(PROYEK.judul)}.</p>
    </div>
  </section>

  <section class="section-tight" style="padding-top:0">
    <div class="container">
      <div class="section-head muncul"><h2>Developer</h2></div>
      <div class="tim">${DEVELOPER.map(kartuDev).join('')}</div>
    </div>
  </section>

  <section class="section-tight">
    <div class="container">
      <div class="section-head muncul">
        <h2>Arsitektur CNN</h2>
        <p>Model ditulis dari nol dengan NumPy (tanpa library <i>deep learning</i>) dan dilatih dengan backpropagation, satu data per pembaruan bobot (SGD).</p>
      </div>
      <div class="arsitektur muncul" role="list">
        ${[
          ['Input', '64 × 64 × 1<br>grayscale 0–1', 'aksen'],
          ['Konvolusi', '8 kernel 3 × 3<br>stride 1, padding 1<br>ReLU', 'utama'],
          ['Max pooling', '2 × 2, stride 2<br>→ 32 × 32 × 8', ''],
          ['Flatten', '8.192 neuron', ''],
          ['Hidden', '16 neuron<br>ReLU', 'utama'],
          ['Output', '9 neuron<br>Softmax', 'aksen'],
        ].map(([j, t, k], i, a) => `<div class="lapis ${k}" role="listitem"><b>${j}</b><span>${t}</span></div>${i < a.length - 1 ? `<span class="panah">${IKON.panah.replace('<svg', '<svg width="20" height="20"')}</span>` : ''}`).join('')}
      </div>
    </div>
  </section>

  <section class="section-tight">
    <div class="container dua-kolom">
      <div class="card info-card muncul">
        <h3>${IKON.lapisan} Parameter pelatihan</h3>
        <table class="tabel">
          <tr><th>Learning rate (α)</th><td class="mono">0,01</td></tr>
          <tr><th>Maksimum epoch</th><td class="mono">50</td></tr>
          <tr><th>Data per pembaruan</th><td>1 citra (SGD)</td></tr>
          <tr><th>Bobot &amp; bias awal</th><td>acak [−0,5; 0,5]</td></tr>
          <tr><th>Fungsi galat</th><td>δₖ = tₖ − yₖ (Softmax)</td></tr>
          <tr><th>Total parameter</th><td class="mono">${ID(totalParam())}</td></tr>
        </table>
      </div>
      <div class="card info-card muncul" style="--d:.08s">
        <h3>${IKON.grafik} Hasil evaluasi</h3>
        <table class="tabel">
          <tr><th>Akurasi uji</th><td class="mono">${persen(ev.akurasi_uji)}</td></tr>
          <tr><th>Presisi (macro)</th><td class="mono">${persen(ev.presisi_makro)}</td></tr>
          <tr><th>Recall (macro)</th><td class="mono">${persen(ev.recall_makro)}</td></tr>
          <tr><th>Data latih / uji</th><td class="mono">${ev.jumlah_latih} / ${ev.jumlah_uji}</td></tr>
        </table>
        <p class="catatan">Diukur dengan pembagian acak berstrata 80:20. Pada foto dengan orang, latar, atau pencahayaan yang sangat berbeda, akurasi bisa lebih rendah.</p>
      </div>
      <div class="card info-card muncul">
        <h3>${IKON.data} Dataset</h3>
        <ul class="daftar">
          <li><b>900 citra primer</b> gestur tangan kanan, 100 citra per angka.</li>
          <li>Diambil dengan kamera ponsel oleh <b>4 partisipan</b>, latar &amp; pencahayaan bervariasi.</li>
          <li>Bentuk gestur mengacu pada buku <b>Jarimatika (Wulandari, 2008)</b>.</li>
        </ul>
      </div>
      <div class="card info-card muncul" style="--d:.08s">
        <h3>${IKON.crop} Preprocessing</h3>
        <ul class="daftar">
          <li><b>Deteksi tangan</b> (MediaPipe Hands) → crop persegi, margin 20%.</li>
          <li><b>Topeng tangan</b> dari 21 titik sendi; latar dihitamkan.</li>
          <li><b>Resize 64 × 64</b> rata-rata kotak → grayscale 0,299R + 0,587G + 0,114B → ÷ 255.</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:clamp(24px,4vw,40px)">
    <div class="container">
      <div class="cta-band muncul">
        <div><h2>Privasi terjaga</h2><p>Seluruh proses — deteksi tangan hingga inferensi CNN — berjalan di browser Anda. Tidak ada foto yang dikirim ke server.</p></div>
        <a href="#/klasifikasi" class="btn btn-accent btn-lg">Coba sekarang ${IKON.panah}</a>
      </div>
    </div>
  </section>`;
}

// ============================== HASIL ==============================
export function halamanHasil(el, { navigasi }) {
  const h = ambilHasil();
  if (!h) {
    el.innerHTML = `
    <div class="container">
      <div class="kosong">
        <div class="ikon-besar">${IKON.gambar}</div>
        <h1 style="font-size:clamp(1.6rem,3vw,2.2rem)">Belum ada hasil klasifikasi</h1>
        <p>Unggah foto atau ambil gambar dengan kamera terlebih dahulu. Hasilnya akan tampil di halaman ini.</p>
        <div class="hero-cta" style="justify-content:center;margin-top:24px">
          <a href="#/klasifikasi" class="btn btn-primary">${IKON.unggah} Unggah gambar</a>
          <button class="btn btn-ghost" data-kamera>${IKON.kamera} Gunakan kamera</button>
        </div>
      </div>
    </div>`;
  } else {
    const urut = h.prob.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]);
    const [pTop, iTop] = urut[0];
    const tingkat = pTop >= 0.9 ? ['tinggi', 'Sangat yakin'] : pTop >= 0.6 ? ['sedang', 'Cukup yakin'] : ['rendah', 'Kurang yakin'];
    const kedua = urut[1];
    const waktu = h.waktu || {};
    el.innerHTML = `
    <section class="page-head">
      <div class="container">
        <span class="eyebrow"><i></i>Hasil klasifikasi</span>
        <h1>Model menebak angka <span style="color:var(--primary)">${iTop + 1}</span></h1>
        <p>Sumber: ${h.sumber === 'kamera' ? 'kamera perangkat' : 'gambar yang diunggah'}${h.namaFile ? ` (${esc(h.namaFile)})` : ''} · ${new Date(h.dibuat).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
      </div>
    </section>
    <section class="container" style="padding-bottom:clamp(48px,7vw,88px)">
      <div class="hasil-grid">
        <div>
          <div class="card kartu-hasil muncul">
            <div class="label">Angka terdeteksi</div>
            <div class="angka-besar" aria-label="Angka ${iTop + 1}">${iTop + 1}</div>
            <span class="keyakinan ${tingkat[0]}">${tingkat[1]} · <b>${prob(pTop)}</b></span>
            <div class="meter" aria-hidden="true"><span data-lebar="${(pTop * 100).toFixed(2)}"></span></div>
            <div class="ref">
              <img src="./assets/img/gestur/${iTop + 1}.webp" alt="Contoh gestur angka ${iTop + 1}" />
              <p><b>Contoh gestur angka ${iTop + 1}</b><br>${GESTUR[iTop]}. Bandingkan dengan foto Anda.</p>
            </div>
            ${pTop < 0.6 ? `<div class="alert alert-warn" style="text-align:left">${IKON.awas}<div><b>Model kurang yakin</b><p>Kemungkinan kedua: angka ${kedua[1] + 1} (${prob(kedua[0])}). Coba foto ulang dengan tangan lebih jelas dan cahaya cukup.</p></div></div>` : ''}
            ${h.jumlahTangan > 1 ? `<div class="alert alert-info" style="text-align:left">${IKON.info}<div><p>Terdeteksi ${h.jumlahTangan} tangan; yang dianalisis adalah tangan terbesar.</p></div></div>` : ''}
          </div>
          <div class="aksi-baris">
            <a href="#/klasifikasi" class="btn btn-primary">${IKON.ulang} Klasifikasi lagi</a>
            <button class="btn btn-ghost" data-kamera>${IKON.kamera} Pakai kamera</button>
          </div>
        </div>
        <div>
          <div class="card blok muncul" style="--d:.05s">
            <h3>Gambar yang dianalisis</h3>
            <div class="gambar-pasang">
              <figure><div class="bingkai"><img src="${h.pratinjau}" alt="Foto dengan area tangan yang terdeteksi" /></div><figcaption>Foto asli · kotak jingga = area crop, titik = sendi tangan</figcaption></figure>
              <figure><div class="bingkai piksel"><img src="${h.input}" alt="Citra masukan 64 kali 64 piksel" /></div><figcaption>Masukan CNN · 64 × 64 grayscale, latar dihitamkan</figcaption></figure>
            </div>
          </div>
          <div class="card blok muncul" style="--d:.1s">
            <h3>Probabilitas tiap kelas (Softmax)</h3>
            <div class="prob" role="list">
              ${h.prob.map((p, i) => `
                <div class="prob-baris${i === iTop ? ' top' : ''}" role="listitem" aria-label="Angka ${i + 1}: ${prob(p)}">
                  <span class="nama">Angka ${i + 1}</span>
                  <span class="batang"><span style="--d:${0.05 * i}s" data-lebar="${Math.max(p * 100, 0.4).toFixed(2)}"></span></span>
                  <span class="nilai">${prob(p)}</span>
                </div>`).join('')}
            </div>
          </div>
          <div class="card blok muncul" style="--d:.15s">
            <h3>Rincian proses</h3>
            <div class="rincian">
              <div><b>${ID(waktu.deteksi || 0)} ms</b><span>Deteksi tangan</span></div>
              <div><b>${ID(waktu.praproses || 0)} ms</b><span>Crop, topeng, resize</span></div>
              <div><b>${ID(waktu.inferensi || 0, 1)} ms</b><span>Inferensi CNN</span></div>
              <div><b>${h.ukuran ? `${h.ukuran[0]}×${h.ukuran[1]}` : '-'}</b><span>Ukuran foto (px)</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
    // animasikan batang setelah dirender
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelectorAll('[data-lebar]').forEach((s) => { s.style.width = `${s.dataset.lebar}%`; });
    }));
  }
  const klik = (e) => {
    if (e.target.closest('[data-kamera]')) { state.mode = 'kamera'; navigasi('/klasifikasi'); }
  };
  el.addEventListener('click', klik);
  return () => el.removeEventListener('click', klik);
}

export function halaman404(el) {
  el.innerHTML = `
  <div class="container"><div class="kosong">
    <div class="ikon-besar">${IKON.info}</div>
    <h1 style="font-size:clamp(1.6rem,3vw,2.2rem)">Halaman tidak ditemukan</h1>
    <p>Alamat yang Anda buka tidak tersedia.</p>
    <a href="#/" class="btn btn-primary" style="margin-top:16px">Kembali ke beranda</a>
  </div></div>`;
}
