// Status aplikasi bersama antarhalaman
const KUNCI = 'jarimatika_hasil_v1';

export const state = {
  hasil: null,          // hasil klasifikasi terakhir
  mode: 'unggah',       // tab aktif di halaman klasifikasi: 'unggah' | 'kamera'
  detektor: 'memuat',   // 'memuat' | 'siap' | 'gagal'
};

const pendengarDetektor = new Set();
export function aturStatusDetektor(s) {
  state.detektor = s;
  pendengarDetektor.forEach((fn) => { try { fn(s); } catch (e) { console.error(e); } });
}
export function dengarDetektor(fn) { pendengarDetektor.add(fn); return () => pendengarDetektor.delete(fn); }

export function simpanHasil(h) {
  state.hasil = h;
  try { sessionStorage.setItem(KUNCI, JSON.stringify(h)); } catch { /* kuota penuh / mode privat — cukup di memori */ }
}

export function ambilHasil() {
  if (state.hasil) return state.hasil;
  try {
    const raw = sessionStorage.getItem(KUNCI);
    if (raw) {
      const h = JSON.parse(raw);
      if (h && Array.isArray(h.prob) && h.prob.length === 9) { state.hasil = h; return h; }
    }
  } catch { /* abaikan data rusak */ }
  return null;
}
