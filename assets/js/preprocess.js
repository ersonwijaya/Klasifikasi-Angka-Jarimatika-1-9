// Preprocessing — sama dengan notebook & pembuatan dataset_jarimatika_mask:
// deteksi tangan (MediaPipe) → kotak persegi (margin 20%) → topeng tangan (latar hitam)
// → resize 64×64 rata-rata kotak (batas floor) → grayscale 0,299R+0,587G+0,114B → ÷255

import { deteksiTangan } from './hand.js';

const MARGIN = 0.20;
const SISI_MIN = 128;
const UKURAN = 64;
const MAKS_PIKSEL = 16_000_000; // batas aman kanvas (terutama iOS Safari)

const SAMBUNGAN = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];

export class GalatPraproses extends Error {
  constructor(kode, pesan) { super(pesan); this.kode = kode; }
}

// Sumber (File/Blob atau kanvas kamera) → kanvas RGB dengan orientasi EXIF sudah diterapkan
export async function keKanvas(sumber) {
  let bmp;
  if (sumber instanceof HTMLCanvasElement) {
    bmp = sumber;
  } else {
    try {
      bmp = await createImageBitmap(sumber, { imageOrientation: 'from-image' });
    } catch {
      throw new GalatPraproses('decode', 'Gambar tidak dapat dibaca. Gunakan file JPG, PNG, atau WEBP.');
    }
  }
  let w = bmp.width, h = bmp.height;
  if (!w || !h) throw new GalatPraproses('decode', 'Gambar kosong atau rusak.');
  if (w < 64 || h < 64) throw new GalatPraproses('kecil', 'Resolusi gambar terlalu kecil (minimal 64 × 64 piksel).');
  let skala = 1;
  if (w * h > MAKS_PIKSEL) skala = Math.sqrt(MAKS_PIKSEL / (w * h));
  const cw = Math.round(w * skala), ch = Math.round(h * skala);
  const kanvas = document.createElement('canvas');
  kanvas.width = cw; kanvas.height = ch;
  const ctx = kanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, cw, ch);
  if (bmp.close) bmp.close();
  return kanvas;
}

function kotakPersegi(titik, w, h) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of titik) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const sisi = Math.min(Math.max(Math.max(x1 - x0, y1 - y0) * (1 + 2 * MARGIN), SISI_MIN), Math.min(w, h));
  const l = Math.min(Math.max(cx - sisi / 2, 0), w - sisi);
  const t = Math.min(Math.max(cy - sisi / 2, 0), h - sisi);
  return [Math.round(l), Math.round(t), Math.round(l + sisi), Math.round(t + sisi)];
}

function gambarTopeng(titik, lebarK, tinggiK, ox, oy) {
  const p = titik.map(([x, y]) => [x - ox, y - oy]);
  const jarak = (a, b) => Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1]);
  const lebar = (jarak(5, 9) + jarak(9, 13) + jarak(13, 17)) / 3;
  const c = document.createElement('canvas');
  c.width = lebarK; c.height = tinggiK;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  g.beginPath();
  [0, 1, 2, 5, 9, 13, 17].forEach((i, n) => (n ? g.lineTo(...p[i]) : g.moveTo(...p[i])));
  g.closePath(); g.fill();
  g.lineWidth = Math.round(lebar); g.lineCap = 'butt';
  for (const [a, b] of SAMBUNGAN) { g.beginPath(); g.moveTo(...p[a]); g.lineTo(...p[b]); g.stroke(); }
  for (const [x, y] of p) { g.beginPath(); g.arc(x, y, lebar / 2, 0, Math.PI * 2); g.fill(); }
  return g.getImageData(0, 0, lebarK, tinggiK).data;
}

// RGBA crop → matriks 64×64 grayscale 0–1 dengan rata-rata kotak (batas kotak floor(j·ukuran/64))
function resizeKotakGray(data, w, h, n = UKURAN) {
  const tb = new Int32Array(n + 1), tk = new Int32Array(n + 1);
  for (let i = 0; i <= n; i++) { tb[i] = Math.floor((i * h) / n); tk[i] = Math.floor((i * w) / n); }
  tb[n] = h; tk[n] = w;
  const I = new Float64Array(n * n);
  const rgb64 = new Uint8ClampedArray(n * n * 3);
  for (let bi = 0; bi < n; bi++) {
    for (let bj = 0; bj < n; bj++) {
      let r = 0, g = 0, b = 0;
      for (let y = tb[bi]; y < tb[bi + 1]; y++) {
        let o = (y * w + tk[bj]) * 4;
        for (let x = tk[bj]; x < tk[bj + 1]; x++, o += 4) { r += data[o]; g += data[o + 1]; b += data[o + 2]; }
      }
      const cnt = (tb[bi + 1] - tb[bi]) * (tk[bj + 1] - tk[bj]);
      const R = Math.round(r / cnt), G = Math.round(g / cnt), B = Math.round(b / cnt);
      const idx = bi * n + bj;
      rgb64[idx * 3] = R; rgb64[idx * 3 + 1] = G; rgb64[idx * 3 + 2] = B;
      I[idx] = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
    }
  }
  return { I, rgb64 };
}

export async function praproses(kanvas) {
  const w = kanvas.width, h = kanvas.height;
  const t0 = performance.now();
  const hasil = await deteksiTangan(kanvas);
  const t1 = performance.now();
  if (!hasil) throw new GalatPraproses('tidak-terdeteksi', 'Tangan tidak terdeteksi pada gambar.');
  const { titik, jumlahTangan } = hasil;
  const [l, t, r, b] = kotakPersegi(titik, w, h);
  const cw = r - l, ch = b - t;
  const crop = kanvas.getContext('2d', { willReadFrequently: true }).getImageData(l, t, cw, ch);
  const m = gambarTopeng(titik, cw, ch, l, t);
  const d = crop.data;
  for (let i = 0; i < d.length; i += 4) {
    if (m[i] <= 127) { d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; }
  }
  const { I } = resizeKotakGray(d, cw, ch);
  const t2 = performance.now();
  return { I, kotak: [l, t, r, b], titik, jumlahTangan, waktu: { deteksi: t1 - t0, praproses: t2 - t1 } };
}

// Visualisasi matriks input 64×64 (grayscale) ke dataURL
export function inputKeDataURL(I, n = UKURAN) {
  const c = document.createElement('canvas');
  c.width = n; c.height = n;
  const g = c.getContext('2d');
  const img = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = Math.round(I[i] * 255);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

// Pratinjau foto asli (diperkecil) dengan kotak crop & titik tangan
export function pratinjauDenganKotak(kanvas, kotak, titik, maks = 900) {
  const s = Math.min(1, maks / Math.max(kanvas.width, kanvas.height));
  const c = document.createElement('canvas');
  c.width = Math.round(kanvas.width * s); c.height = Math.round(kanvas.height * s);
  const g = c.getContext('2d');
  g.drawImage(kanvas, 0, 0, c.width, c.height);
  if (kotak) {
    const [l, t, r, b] = kotak.map((v) => v * s);
    const lw = Math.max(2, Math.round(c.width / 260));
    g.strokeStyle = '#F2994A'; g.lineWidth = lw;
    g.strokeRect(l, t, r - l, b - t);
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.strokeStyle = '#3B3AA8'; g.lineWidth = Math.max(1, lw * 0.6);
    for (const [a, bb] of SAMBUNGAN) {
      g.beginPath(); g.moveTo(titik[a][0] * s, titik[a][1] * s); g.lineTo(titik[bb][0] * s, titik[bb][1] * s); g.stroke();
    }
    for (const [x, y] of titik) { g.beginPath(); g.arc(x * s, y * s, lw * 1.1, 0, Math.PI * 2); g.fill(); g.stroke(); }
  }
  return c.toDataURL('image/jpeg', 0.86);
}
