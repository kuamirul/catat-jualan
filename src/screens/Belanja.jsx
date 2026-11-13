import { useState } from 'preact/hooks';
import { db } from '../db.js';
import { hariIni, tambahHari, tarikhPenuh } from '../lib/tarikh.js';
import { rm } from '../lib/wang.js';
import { InputWang, toast, sahkan } from '../components/ui.jsx';

export const BARANG = [
  'beras', 'santan', 'ikan bilis', 'telur', 'timun', 'kacang', 'cili',
  'bawang', 'daun pisang', 'bungkusan', 'gas', 'minyak', 'petrol',
];
const LAIN = 'lain-lain';

const huruf = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function Belanja({ data }) {
  const [tarikh, setTarikh] = useState(hariIni());
  const [barang, setBarang] = useState(null);
  const [lain, setLain] = useState('');
  const [jumlah, setJumlah] = useState(null);
  const [ubahId, setUbahId] = useState(null);

  const senarai = data.belanja.filter((b) => b.tarikh === tarikh).sort((a, b) => b.id - a.id);
  const jumlahHari = senarai.reduce((s, b) => s + b.jumlah, 0);
  const namaBarang = barang === LAIN ? lain.trim() : barang;
  const boleh = namaBarang && jumlah != null && jumlah > 0;

  const kosongkan = () => { setBarang(null); setLain(''); setJumlah(null); setUbahId(null); };

  const simpan = async () => {
    if (!boleh) return;
    const rekod = { tarikh, barang: namaBarang.toLowerCase(), jumlah };
    if (ubahId) await db.belanja.update(ubahId, rekod);
    else await db.belanja.add(rekod);
    toast(`${huruf(namaBarang)} ${rm(jumlah)} disimpan`);
    kosongkan();
  };

  const ubah = (b) => {
    setUbahId(b.id);
    setTarikh(b.tarikh);
    if (BARANG.includes(b.barang)) { setBarang(b.barang); setLain(''); }
    else { setBarang(LAIN); setLain(b.barang); }
    setJumlah(b.jumlah);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const padam = async (b) => {
    const ok = await sahkan({ tajuk: `Padam ${huruf(b.barang)} ${rm(b.jumlah)}?`, ya: 'Padam', bahaya: true });
    if (!ok) return;
    await db.belanja.delete(b.id);
    if (ubahId === b.id) kosongkan();
    toast('Dipadam', { undo: () => db.belanja.put(b) });
  };

  return (
    <div>
      <h1>Belanja</h1>

      <div class="kad">
        <label class="label">Beli apa?</label>
        <div class="cip-senarai" role="group" aria-label="Barang">
          {[...BARANG, LAIN].map((b) => (
            <button
              type="button"
              class={`cip ${barang === b ? 'dipilih' : ''}`}
              aria-pressed={barang === b}
              onClick={() => setBarang(b)}
            >{huruf(b)}</button>
          ))}
        </div>
        {barang === LAIN && (
          <input
            class="input-teks"
            type="text"
            placeholder="Tulis nama barang"
            aria-label="Nama barang"
            value={lain}
            autoFocus
            onInput={(e) => setLain(e.target.value)}
          />
        )}

        <label class="label" for="jumlah-belanja">Harga</label>
        <InputWang id="jumlah-belanja" nilai={jumlah} ubah={setJumlah} label="Harga" />

        <label class="label" for="tarikh-belanja">Tarikh</label>
        <input
          id="tarikh-belanja"
          class="input-teks"
          type="date"
          value={tarikh}
          max={tambahHari(hariIni(), 1)}
          onChange={(e) => e.target.value && setTarikh(e.target.value)}
        />

        <div class="baris-butang">
          {ubahId && <button class="butang kedua" onClick={kosongkan}>Batal</button>}
          <button class="butang utama besar" disabled={!boleh} onClick={simpan}>
            {ubahId ? 'Simpan perubahan' : 'Simpan'}
          </button>
        </div>
      </div>

      <h2 class="subtajuk">{tarikh === hariIni() ? 'Belanja hari ini' : tarikhPenuh(tarikh)}</h2>
      {senarai.length === 0 && <p class="kecil kosong">Tiada belanja lagi.</p>}
      <ul class="senarai">
        {senarai.map((b) => (
          <li class={`senarai-item ${ubahId === b.id ? 'sedang-ubah' : ''}`}>
            <button class="senarai-utama" onClick={() => ubah(b)} aria-label={`Ubah ${b.barang}`}>
              <span>{huruf(b.barang)}</span>
              <strong>{rm(b.jumlah)}</strong>
            </button>
            <button class="butang-ikon kecil-ikon" aria-label={`Padam ${b.barang}`} onClick={() => padam(b)}>✕</button>
          </li>
        ))}
      </ul>
      {senarai.length > 0 && (
        <div class="jumlah-bawah"><span>Jumlah</span><strong>{rm(jumlahHari)}</strong></div>
      )}
    </div>
  );
}
