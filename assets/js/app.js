// Aplikasi utama: splash, router (hash), transisi halaman, toast, penanganan galat global.
import { muatModel } from './model.js';
import { siapkanDetektor } from './hand.js';
import { state, simpanHasil, ambilHasil, aturStatusDetektor } from './state.js';
import { halamanBeranda, halamanTentang, halamanHasil, halaman404 } from './pages.js';
import { halamanKlasifikasi } from './klasifikasi.js';

const ROUTES = {
  '/': { judul: 'Beranda', render: halamanBeranda },
  '/tentang': { judul: 'Tentang', render: halamanTentang },
  '/klasifikasi': { judul: 'Klasifikasi', render: halamanKlasifikasi },
  '/hasil': { judul: 'Hasil Klasifikasi', render: halamanHasil },
};

const view = document.getElementById('view');
const main = document.getElementById('main');
let bersihkanHalaman = null;   // fungsi cleanup dari halaman aktif (mis. mematikan kamera)
let tokenNavigasi = 0;
let ruteAktif = null;

// ---------- toast ----------
export function toast(pesan, durasi = 3600) {
  const wrap = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = pesan;
  wrap.appendChild(el);
  while (wrap.children.length > 3) wrap.firstElementChild.remove();
  setTimeout(() => { el.classList.add('keluar'); setTimeout(() => el.remove(), 320); }, durasi);
}

// ---------- router ----------
function ruteDariHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, query] = h.split('?');
  return { path: path || '/', params: new URLSearchParams(query || '') };
}

export function navigasi(path) {
  if (location.hash === '#' + path) render(true);
  else location.hash = path;
}

async function render(paksa = false) {
  const { path, params } = ruteDariHash();
  if (!paksa && path === ruteAktif && !params.toString()) return;
  const token = ++tokenNavigasi;
  const rute = ROUTES[path];

  // tutup menu seluler & bersihkan halaman lama
  tutupMenu();
  if (bersihkanHalaman) { try { bersihkanHalaman(); } catch (e) { console.error(e); } bersihkanHalaman = null; }

  if (ruteAktif !== null) {
    view.classList.remove('masuk');
    view.classList.add('keluar');
    await new Promise((r) => setTimeout(r, 170));
    if (token !== tokenNavigasi) return;   // ada navigasi lebih baru
  }
  ruteAktif = path;
  view.classList.remove('keluar');

  const ctx = { params, navigasi, toast };
  const hasil = (rute ? rute.render : halaman404)(view, ctx);
  bersihkanHalaman = typeof hasil === 'function' ? hasil : null;
  document.title = `${rute ? rute.judul : 'Halaman tidak ditemukan'} · Jarimatika CNN`;

  void view.offsetWidth;   // restart animasi
  view.classList.add('masuk');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  main.focus({ preventScroll: true });
  tandaiNav(path);
  amatiMuncul(view);
}

function tandaiNav(path) {
  document.querySelectorAll('.site-nav a[data-route]').forEach((a) => {
    const aktif = a.dataset.route === path;
    a.classList.toggle('aktif', aktif);
    if (aktif) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.getElementById('nav-hasil').classList.toggle('nonaktif', !ambilHasil());
}

// animasi muncul saat elemen masuk viewport
let pengamat = null;
function amatiMuncul(root) {
  const el = root.querySelectorAll('.muncul');
  if (!('IntersectionObserver' in window)) { el.forEach((e) => e.classList.add('terlihat')); return; }
  if (pengamat) pengamat.disconnect();
  pengamat = new IntersectionObserver((entri) => {
    entri.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('terlihat'); pengamat.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  el.forEach((e) => pengamat.observe(e));
}

// ---------- header & menu seluler ----------
const toggle = document.getElementById('nav-toggle');
const nav = document.getElementById('site-nav');
function tutupMenu() { nav.classList.remove('terbuka'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Buka menu'); }
toggle.addEventListener('click', () => {
  const buka = !nav.classList.contains('terbuka');
  nav.classList.toggle('terbuka', buka);
  toggle.setAttribute('aria-expanded', String(buka));
  toggle.setAttribute('aria-label', buka ? 'Tutup menu' : 'Buka menu');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tutupMenu(); });
document.addEventListener('click', (e) => {
  if (nav.classList.contains('terbuka') && !nav.contains(e.target) && !toggle.contains(e.target)) tutupMenu();
});
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => header.classList.toggle('tergulir', window.scrollY > 8), { passive: true });

// cegah browser membuka file bila dijatuhkan di luar area unggah
['dragover', 'drop'].forEach((ev) => window.addEventListener(ev, (e) => {
  if (!e.target.closest || !e.target.closest('.dropzone')) e.preventDefault();
}));

// galat global → toast (tanpa membuat aplikasi macet)
window.addEventListener('error', (e) => { console.error(e.error || e.message); });
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast('Terjadi kesalahan tak terduga. Silakan coba lagi.');
});

// ---------- splash ----------
const splash = document.getElementById('splash');
const bar = document.getElementById('splash-bar');
const statusEl = document.getElementById('splash-status');
const retry = document.getElementById('splash-retry');
const progres = (p, teks) => { bar.style.width = `${Math.round(p * 100)}%`; if (teks) statusEl.textContent = teks; };
const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

async function mulai() {
  document.body.classList.add('splash-aktif');
  const t0 = performance.now();
  try {
    progres(0.08, 'Memuat tampilan…');
    await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), tunggu(1500)]);
    progres(0.25, 'Memuat bobot model CNN…');
    await muatModel((p) => progres(0.25 + p * 0.35));
    progres(0.62, 'Menyiapkan detektor tangan…');
    const detektor = siapkanDetektor()
      .then(() => aturStatusDetektor('siap'))
      .catch((e) => { console.error(e); aturStatusDetektor('gagal'); });
    // tunggu detektor maksimal 6 detik; sisanya dilanjutkan di latar belakang
    await Promise.race([detektor, tunggu(6000)]);
    progres(1, state.detektor === 'siap' ? 'Siap!' : 'Hampir siap…');
    const sisa = 1500 - (performance.now() - t0);
    if (sisa > 0) await tunggu(sisa);
  } catch (e) {
    console.error(e);
    progres(1, 'Gagal memuat model. Periksa koneksi lalu coba lagi.');
    bar.style.background = '#F2994A';
    retry.hidden = false;
    retry.onclick = () => location.reload();
    return;
  }
  splash.classList.add('selesai');
  document.body.classList.remove('splash-aktif');
  setTimeout(() => splash.remove(), 700);
}

window.addEventListener('hashchange', () => render());
render(true);
mulai();

// ekspor untuk pengujian otomatis
window.__jarimatika = { state, simpanHasil, ambilHasil };
