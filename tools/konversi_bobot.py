"""Mengubah bobot hasil Google Colab (bobot_akhir_cnn.npz) menjadi bobot website (assets/model/bobot.bin).

Pemakaian (dari folder utama repo):
    python tools/konversi_bobot.py path/ke/bobot_akhir_cnn.npz
    python tools/konversi_bobot.py path/ke/bobot_akhir_cnn.npz --akurasi 0.9444 --presisi 0.9492 --recall 0.9444

Bila argumen akurasi/presisi/recall tidak diisi, nilai evaluasi lama di model.json dipertahankan.
Membutuhkan: numpy  (pip install numpy)
"""
import argparse, json, os
import numpy as np

URUTAN = ['K', 'bc', 'V', 'v0', 'W', 'w0']
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR_MODEL = os.path.join(ROOT, 'assets', 'model')

ap = argparse.ArgumentParser()
ap.add_argument('npz')
ap.add_argument('--akurasi', type=float)
ap.add_argument('--presisi', type=float)
ap.add_argument('--recall', type=float)
a = ap.parse_args()

d = np.load(a.npz)
cfg = json.loads(str(d['config']))
assert cfg['input_size'] == 64 and cfg['n_kelas'] == 9, 'Website ini dibuat untuk input 64x64 dan 9 kelas.'

path_json = os.path.join(DIR_MODEL, 'model.json')
lama = json.load(open(path_json)) if os.path.exists(path_json) else {}
meta, buf, off = {}, b'', 0
for k in URUTAN:
    arr = d[k].astype('<f4')
    meta[k] = {'shape': list(arr.shape), 'offset': off, 'length': int(arr.size)}
    off += arr.size
    buf += arr.tobytes()

ev = lama.get('evaluasi', {})
if a.akurasi is not None: ev['akurasi_uji'] = a.akurasi
if a.presisi is not None: ev['presisi_makro'] = a.presisi
if a.recall is not None: ev['recall_makro'] = a.recall

model = dict(lama, arsitektur=cfg, parameter=meta, total_parameter=off, evaluasi=ev)
with open(os.path.join(DIR_MODEL, 'bobot.bin'), 'wb') as f:
    f.write(buf)
with open(path_json, 'w') as f:
    json.dump(model, f, indent=1)
print(f'Selesai: {off:,} parameter ditulis ke assets/model/bobot.bin')
