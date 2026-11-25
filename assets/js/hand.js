// Deteksi 21 titik tangan dengan MediaPipe Hand Landmarker (di-host sendiri, tanpa CDN).
import { FilesetResolver, HandLandmarker } from '../mediapipe/vision_bundle.mjs';

let detektor = null;
let janji = null;

export function siapkanDetektor() {
  if (detektor) return Promise.resolve(detektor);
  if (janji) return janji;
  janji = (async () => {
    const vision = await FilesetResolver.forVisionTasks(new URL('../mediapipe/wasm', import.meta.url).href);
    detektor = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: new URL('../mediapipe/hand_landmarker.task', import.meta.url).href, delegate: 'CPU' },
      runningMode: 'IMAGE',
      numHands: 2,
      minHandDetectionConfidence: 0.3,
    });
    return detektor;
  })().catch((e) => { janji = null; throw e; });
  return janji;
}

function pilihTangan(res, w, h) {
  if (!res || !res.landmarks || res.landmarks.length === 0) return null;
  let terbaik = null, luasMaks = -1;
  for (const lm of res.landmarks) {
    const titik = lm.map((p) => [p.x * w, p.y * h]);
    const xs = titik.map((t) => t[0]), ys = titik.map((t) => t[1]);
    const luas = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (luas > luasMaks) { luasMaks = luas; terbaik = titik; }
  }
  return { titik: terbaik, jumlahTangan: res.landmarks.length };
}

// kanvas: HTMLCanvasElement berisi foto ukuran penuh. Mengembalikan titik dalam koordinat piksel kanvas.
export async function deteksiTangan(kanvas) {
  const d = await siapkanDetektor();
  const w = kanvas.width, h = kanvas.height;
  let hasil = pilihTangan(d.detect(kanvas), w, h);
  if (!hasil) {
    // coba lagi pada versi kecil (lebar 640) — sama dengan notebook
    const k = document.createElement('canvas');
    k.width = 640; k.height = Math.max(1, Math.round((640 * h) / w));
    k.getContext('2d').drawImage(kanvas, 0, 0, k.width, k.height);
    hasil = pilihTangan(d.detect(k), w, h); // koordinat ternormalisasi → dikali ukuran asli
  }
  return hasil;
}
