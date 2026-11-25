// CNN Jarimatika — umpan maju (inferensi) yang sama persis dengan kelas CNNJarimatika di notebook.
// Bobot dimuat dari assets/model/bobot.bin (float32, urutan K, bc, V, v0, W, w0).

let MODEL = null;

export async function muatModel(onProgress = () => {}) {
  if (MODEL) return MODEL;
  const meta = await fetch(new URL('../model/model.json', import.meta.url)).then((r) => {
    if (!r.ok) throw new Error('model.json tidak dapat dimuat');
    return r.json();
  });
  onProgress(0.4);
  const buf = await fetch(new URL('../model/bobot.bin', import.meta.url)).then((r) => {
    if (!r.ok) throw new Error('bobot.bin tidak dapat dimuat');
    return r.arrayBuffer();
  });
  const all = new Float32Array(buf);
  if (all.length !== meta.total_parameter) throw new Error('Ukuran bobot tidak sesuai model.json');
  const p = {};
  for (const [nama, info] of Object.entries(meta.parameter)) {
    p[nama] = all.subarray(info.offset, info.offset + info.length);
  }
  MODEL = { meta, p, cfg: meta.arsitektur };
  onProgress(1);
  return MODEL;
}

export function infoModel() {
  return MODEL ? MODEL.meta : null;
}

// I: Float64Array panjang n*n, nilai 0–1 (grayscale ÷ 255)
export function prediksi(I) {
  if (!MODEL) throw new Error('Model belum dimuat');
  const { p, cfg } = MODEL;
  const n = cfg.input_size, F = cfg.n_filter, k = cfg.kernel_size, q = (k - 1) >> 1;
  const J = cfg.n_hidden, C = cfg.n_kelas, h = n >> 1;

  // 1) zero padding + konvolusi (stride 1) + ReLU
  const R = new Float64Array(F * n * n);
  for (let f = 0; f < F; f++) {
    const bc = p.bc[f], Kf = f * k * k;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let s = bc;
        for (let u = 0; u < k; u++) {
          const y = i + u - q;
          if (y < 0 || y >= n) continue;
          for (let v = 0; v < k; v++) {
            const x = j + v - q;
            if (x < 0 || x >= n) continue;
            s += I[y * n + x] * p.K[Kf + u * k + v];
          }
        }
        R[(f * n + i) * n + j] = s > 0 ? s : 0;
      }
    }
  }

  // 2) max pooling 2x2 stride 2, lalu flatten (urutan filter, baris, kolom — sama dengan numpy reshape)
  const x = new Float64Array(F * h * h);
  for (let f = 0; f < F; f++) {
    for (let i = 0; i < h; i++) {
      for (let j = 0; j < h; j++) {
        const b = (f * n + 2 * i) * n + 2 * j;
        x[(f * h + i) * h + j] = Math.max(R[b], R[b + 1], R[b + n], R[b + n + 1]);
      }
    }
  }

  // 3) hidden layer: z_in = v0 + x·V ; z = ReLU
  const z = new Float64Array(J);
  for (let jj = 0; jj < J; jj++) z[jj] = p.v0[jj];
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    if (xi === 0) continue;
    const row = i * J;
    for (let jj = 0; jj < J; jj++) z[jj] += xi * p.V[row + jj];
  }
  for (let jj = 0; jj < J; jj++) if (z[jj] < 0) z[jj] = 0;

  // 4) output layer + Softmax
  const yin = new Float64Array(C);
  for (let c = 0; c < C; c++) {
    let s = p.w0[c];
    for (let jj = 0; jj < J; jj++) s += z[jj] * p.W[jj * C + c];
    yin[c] = s;
  }
  const mx = Math.max(...yin);
  let tot = 0;
  const y = yin.map((v) => { const e = Math.exp(v - mx); tot += e; return e; });
  for (let c = 0; c < C; c++) y[c] /= tot;
  return Array.from(y);
}
